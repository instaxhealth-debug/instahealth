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
 * - sku (required): Product SKU
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
    const sku = searchParams.get("sku");
    const replaceExistingParam = searchParams.get("replaceExisting");
    const replaceExisting = replaceExistingParam === "true";

    if (!sku) {
      return NextResponse.json(
        { error: "Missing required parameter: sku" },
        { status: 400 }
      );
    }

    // Look up product by vendor-scoped SKU
    const product = await prisma.product.findUnique({
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

    if (!product) {
      return NextResponse.json(
        { error: `Product not found for SKU: ${sku}` },
        { status: 404 }
      );
    }

    // If product already has an image and replaceExisting is false, block upload
    if (product.imageUrl && !replaceExisting) {
      console.log("[CAN_UPLOAD] Blocked:", {
        vendorId,
        sku,
        hasImage: true,
        replaceExisting: false,
      });

      return NextResponse.json({
        ok: false,
        reason: "Product already has an image. Toggle 'Replace Existing Images' to overwrite.",
        product: {
          sku: product.sku,
          name: product.name,
          currentImageUrl: product.imageUrl,
        },
      });
    }

    // Upload is allowed
    console.log("[CAN_UPLOAD] Allowed:", {
      vendorId,
      sku,
      hasImage: !!product.imageUrl,
      replaceExisting,
    });

    return NextResponse.json({
      ok: true,
      product: {
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
