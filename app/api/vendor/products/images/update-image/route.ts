import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/vendor/products/images/update-image
 *
 * Update a product's imageUrl after client-side upload to Blob
 * This is a TINY JSON request - no file bytes
 */
export async function POST(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    // Parse request body (small JSON payload)
    const body = await req.json();
    const { sku, imageUrl, replaceExisting } = body;

    if (!sku || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: sku, imageUrl" },
        { status: 400 }
      );
    }

    // Find product by vendor-scoped SKU
    const product = await prisma.product.findUnique({
      where: {
        vendorId_sku: {
          vendorId,
          sku,
        },
      },
      select: {
        id: true,
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

    return NextResponse.json({
      success: true,
      sku,
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
