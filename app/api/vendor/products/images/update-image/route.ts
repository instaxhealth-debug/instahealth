import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import {
  findSkuMatches,
  isSafeAutoAssignment,
  normalizeSkuCandidate,
} from "@/lib/sku-matching";

/**
 * POST /api/vendor/products/images/update-image
 *
 * Update a product's imageUrl after client-side upload to Blob
 * This is a TINY JSON request - no file bytes
 *
 * Supports fuzzy SKU matching with optional auto-assignment
 */
export async function POST(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    // Parse request body (small JSON payload)
    const body = await req.json();
    const {
      sku,
      imageUrl,
      replaceExisting,
      filename, // optional: for logging
      allowFuzzyMatch = false, // enable fuzzy matching
    } = body;

    if (!sku || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: sku, imageUrl" },
        { status: 400 }
      );
    }

    // Try exact match first (vendor-scoped)
    let product = await prisma.product.findUnique({
      where: {
        vendorId_sku: {
          vendorId,
          sku,
        },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        imageUrl: true,
      },
    });

    let matchScore = 1.0;
    let matchMethod: "exact" | "normalized" | "fuzzy" | "none" = "exact";
    let suggestedMatches: any[] = [];

    // If no exact match, try fuzzy matching (if enabled)
    if (!product && allowFuzzyMatch) {
      // Fetch all vendor products for fuzzy matching (filter out null SKUs)
      const vendorProducts = await prisma.product.findMany({
        where: {
          vendorId,
          sku: { not: null },
        },
        select: {
          id: true,
          sku: true,
          name: true,
        },
      });

      // Filter and cast to ensure SKU is never null
      const validProducts = vendorProducts
        .filter((p) => p.sku !== null)
        .map((p) => ({
          id: p.id,
          sku: p.sku as string,
          name: p.name,
        }));

      const matches = findSkuMatches(sku, validProducts, 3);

      if (matches.length > 0) {
        const bestMatch = matches[0];
        matchScore = bestMatch.score;

        // Check if this is a normalized exact match
        if (bestMatch.isExactMatch) {
          matchMethod = "normalized";
          // Auto-assign for normalized exact matches
          product = await prisma.product.findUnique({
            where: {
              vendorId_sku: {
                vendorId,
                sku: bestMatch.sku,
              },
            },
            select: {
              id: true,
              sku: true,
              name: true,
              imageUrl: true,
            },
          });
        } else if (isSafeAutoAssignment(matches)) {
          // Safe to auto-assign fuzzy match
          matchMethod = "fuzzy";
          product = await prisma.product.findUnique({
            where: {
              vendorId_sku: {
                vendorId,
                sku: bestMatch.sku,
              },
            },
            select: {
              id: true,
              sku: true,
              name: true,
              imageUrl: true,
            },
          });
        } else {
          // Not safe - return suggestions for manual confirmation
          suggestedMatches = matches;
        }
      }
    }

    // Log the match attempt (no secrets)
    console.log("[UPDATE_IMAGE] Match attempt:", {
      vendorId,
      filename: filename || "unknown",
      derivedSku: sku,
      normalizedDerivedSku: normalizeSkuCandidate(sku),
      chosenSku: product?.sku || null,
      matchMethod,
      matchScore: matchScore.toFixed(3),
      fuzzyMatchEnabled: allowFuzzyMatch,
      suggestionsCount: suggestedMatches.length,
    });

    // If still no product, return error with suggestions
    if (!product) {
      if (suggestedMatches.length > 0) {
        return NextResponse.json(
          {
            error: `Product not found for SKU: ${sku}`,
            requiresConfirmation: true,
            suggestions: suggestedMatches.map((m) => ({
              sku: m.sku,
              productName: m.productName,
              score: m.score,
              scorePercent: `${(m.score * 100).toFixed(1)}%`,
            })),
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Product not found for SKU: ${sku}` },
        { status: 404 }
      );
    }

    // Check if image already exists
    if (product.imageUrl && !replaceExisting) {
      return NextResponse.json(
        {
          error: `Product already has an image. Enable "Replace existing" to overwrite.`,
        },
        { status: 409 }
      );
    }

    // Update product imageUrl
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl },
    });

    // Log successful update
    console.log("[UPDATE_IMAGE] Success:", {
      vendorId,
      filename: filename || "unknown",
      derivedSku: sku,
      actualSku: product.sku,
      matchMethod,
      matchScore: matchScore.toFixed(3),
      imageUrl,
    });

    return NextResponse.json({
      success: true,
      sku: product.sku, // Return actual SKU (may differ from input if fuzzy matched)
      derivedSku: sku, // Original derived SKU
      imageUrl,
      productName: product.name,
      matchMethod,
      matchScore,
      wasAutoAssigned: matchMethod !== "exact",
    });
  } catch (error: any) {
    console.error("[UPDATE_IMAGE] Error:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Forbidden - No vendor account" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update image", details: error.message },
      { status: 500 }
    );
  }
}
