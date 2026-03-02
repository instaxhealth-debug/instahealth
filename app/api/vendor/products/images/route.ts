import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

/**
 * DELETE /api/vendor/products/images
 *
 * Delete image from product (set imageUrl to null)
 * Optionally delete blob from storage
 *
 * Body:
 * - sku (required): Product SKU
 * - deleteBlob (optional): true to also delete blob from storage
 */
export async function DELETE(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    const body = await req.json();
    const { sku, deleteBlob = false } = body;

    if (!sku) {
      console.error("[DELETE_IMAGE] Missing SKU:", { vendorId });
      return NextResponse.json(
        { error: "Missing required parameter: sku" },
        { status: 400 }
      );
    }

    console.log("[DELETE_IMAGE] Delete request:", {
      vendorId,
      sku,
      deleteBlob,
    });

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
        sku: true,
        name: true,
        imageUrl: true,
      },
    });

    if (!product) {
      console.error("[DELETE_IMAGE] Product not found:", {
        vendorId,
        sku,
      });
      return NextResponse.json(
        { error: `Product not found for SKU: ${sku}` },
        { status: 404 }
      );
    }

    const oldImageUrl = product.imageUrl;

    // Set imageUrl to null in database
    await prisma.product.update({
      where: {
        vendorId_sku: {
          vendorId,
          sku,
        },
      },
      data: {
        imageUrl: null,
      },
    });

    console.log("[DELETE_IMAGE] Database updated:", {
      vendorId,
      sku,
      oldImageUrl,
    });

    // Optionally delete blob from storage
    if (deleteBlob && oldImageUrl) {
      try {
        // Verify URL is a Vercel Blob URL and belongs to this vendor
        const isVercelBlob = oldImageUrl.includes("blob.vercel-storage.com") ||
                             oldImageUrl.includes("public.blob.vercel-storage.com");
        const belongsToVendor = oldImageUrl.includes(`/vendors/${vendorId}/products/`);

        if (isVercelBlob && belongsToVendor) {
          await del(oldImageUrl);
          console.log("[DELETE_IMAGE] Blob deleted:", {
            vendorId,
            sku,
            url: oldImageUrl,
          });
        } else {
          console.warn("[DELETE_IMAGE] Skipping blob deletion (not vendor-scoped or not Vercel Blob):", {
            vendorId,
            sku,
            url: oldImageUrl,
            isVercelBlob,
            belongsToVendor,
          });
        }
      } catch (blobError: any) {
        // Log error but don't fail request - DB was updated successfully
        console.error("[DELETE_IMAGE] Blob deletion failed:", {
          vendorId,
          sku,
          url: oldImageUrl,
          error: blobError.message,
        });
      }
    }

    console.log("[DELETE_IMAGE] Success:", {
      vendorId,
      sku,
      deletedBlob: deleteBlob && oldImageUrl,
    });

    return NextResponse.json({
      success: true,
      sku,
      productName: product.name,
      deletedImageUrl: oldImageUrl,
      deletedBlob: deleteBlob && oldImageUrl,
    });
  } catch (error: any) {
    console.error("[DELETE_IMAGE] Error:", error);

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
      { error: "Failed to delete image", details: error.message },
      { status: 500 }
    );
  }
}
