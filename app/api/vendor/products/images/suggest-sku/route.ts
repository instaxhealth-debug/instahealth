import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { findSkuMatches, normalizeSkuCandidate } from "@/lib/sku-matching";

/**
 * POST /api/vendor/products/images/suggest-sku
 *
 * Returns SKU suggestions for a given filename/candidate SKU
 * Uses fuzzy matching with Jaro-Winkler similarity
 *
 * Request body:
 * {
 *   "candidateSku": "ABC-123-copy",
 *   "topN": 3  // optional, defaults to 3
 * }
 *
 * Response:
 * {
 *   "candidateSku": "ABC-123-copy",
 *   "normalizedCandidate": "abc-123",
 *   "suggestions": [
 *     {
 *       "sku": "ABC-123",
 *       "productId": "...",
 *       "productName": "Product Name",
 *       "score": 1.0,
 *       "isExactMatch": true
 *     }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    const body = await req.json();
    const { candidateSku, topN = 3 } = body;

    if (!candidateSku) {
      return NextResponse.json(
        { error: "Missing required field: candidateSku" },
        { status: 400 }
      );
    }

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

    if (vendorProducts.length === 0) {
      return NextResponse.json({
        candidateSku,
        normalizedCandidate: normalizeSkuCandidate(candidateSku),
        suggestions: [],
        message: "No products found for this vendor",
      });
    }

    // Filter and cast to ensure SKU is never null
    const validProducts = vendorProducts
      .filter((p) => p.sku !== null)
      .map((p) => ({
        id: p.id,
        sku: p.sku as string,
        name: p.name,
      }));

    // Find matches using fuzzy matching
    const suggestions = findSkuMatches(candidateSku, validProducts, topN);

    return NextResponse.json({
      candidateSku,
      normalizedCandidate: normalizeSkuCandidate(candidateSku),
      suggestions,
    });
  } catch (error: any) {
    console.error("[SUGGEST_SKU] Error:", error);

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
      { error: "Failed to suggest SKUs", details: error.message },
      { status: 500 }
    );
  }
}
