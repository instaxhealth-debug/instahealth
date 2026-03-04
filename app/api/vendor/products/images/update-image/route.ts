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
 * Uses productId for all operations (no SKU dependency)
 */
export async function POST(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    // Parse request body (small JSON payload)
    const body = await req.json();
    const {
      productId,
      imageUrl,
      replaceExisting,
      filename, // optional: for logging
    } = body;

    if (!productId || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: productId, imageUrl" },
        { status: 400 }
      );
    }

    // Look up product by ID (vendor-scoped)
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        vendorId,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        imageUrl: true,
      },
    });

    // If product not found, return error
    if (!product) {
      console.error("[UPDATE_IMAGE] ❌ NOT FOUND:", {
        vendorId,
        productId,
        filename: filename || "unknown",
      });
      return NextResponse.json(
        { error: `Product not found for ID: ${productId}` },
        { status: 404 }
      );
    }

    // Log the update attempt (no secrets)
    console.log("[UPDATE_IMAGE] 📝 Attempt:", {
      vendorId,
      productId,
      productName: product.name,
      sku: product.sku || "NO SKU",
      filename: filename || "unknown",
      hasImageUrl: !!product.imageUrl,
      replaceExisting,
      willOverwrite: !!product.imageUrl && replaceExisting,
      // NO imageUrl logged - it's a full URL that may contain tokens
    });

    // Check if image already exists
    if (product.imageUrl && !replaceExisting) {
      console.log("[UPDATE_IMAGE] ❌ CONFLICT:", {
        vendorId,
        productId,
        reason: "Product already has image and replaceExisting=false",
      });
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
    console.log("[UPDATE_IMAGE] ✅ SUCCESS:", {
      vendorId,
      productId,
      productName: product.name,
      sku: product.sku || "NO SKU",
      filename: filename || "unknown",
      operation: product.imageUrl ? "OVERWRITE" : "NEW",
      // NO imageUrl logged - it's a full URL
    });

    return NextResponse.json({
      success: true,
      productId: product.id,
      sku: product.sku,
      imageUrl,
      productName: product.name,
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
