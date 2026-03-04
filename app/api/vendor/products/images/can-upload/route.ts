import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/vendor/products/images/can-upload
 *
 * Pre-check before uploading to prevent orphan blobs
 * Checks if product exists and whether it already has an image
 *
 * Query params:
 * - productId (required): Product ID
 * - replaceExisting (optional): "true" or "false"
 *
 * Returns:
 * - 404 if product not found
 * - { ok: true } if upload is allowed
 * - { ok: false, reason: "..." } if upload should be blocked
 */
export async function GET(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const replaceExistingParam = searchParams.get("replaceExisting");
    const replaceExisting = replaceExistingParam === "true";

    if (!productId) {
      return NextResponse.json(
        { error: "Missing required parameter: productId" },
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

    if (!product) {
      return NextResponse.json(
        { error: `Product not found for ID: ${productId}` },
        { status: 404 }
      );
    }

    // If product already has an image and replaceExisting is false, block upload
    if (product.imageUrl && !replaceExisting) {
      console.log("[CAN_UPLOAD] ❌ BLOCKED:", {
        vendorId,
        productId,
        productName: product.name,
        sku: product.sku || "NO SKU",
        hasImageUrl: !!product.imageUrl,
        replaceExisting,
        reason: "Product already has image and replaceExisting=false",
      });

      return NextResponse.json({
        ok: false,
        reason: "Product already has an image. Toggle 'Replace Existing Images' to overwrite.",
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          currentImageUrl: product.imageUrl,
        },
      });
    }

    // Upload is allowed
    console.log("[CAN_UPLOAD] ✅ ALLOWED:", {
      vendorId,
      productId,
      productName: product.name,
      sku: product.sku || "NO SKU",
      hasImageUrl: !!product.imageUrl,
      replaceExisting,
      willOverwrite: !!product.imageUrl && replaceExisting,
    });

    return NextResponse.json({
      ok: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        currentImageUrl: product.imageUrl,
      },
    });
  } catch (error: any) {
    console.error("[CAN_UPLOAD] Error:", error);

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
      { error: "Failed to check upload permission", details: error.message },
      { status: 500 }
    );
  }
}
