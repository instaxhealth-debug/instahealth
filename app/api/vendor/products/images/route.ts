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
 * - productId (required): Product ID
 * - deleteBlob (optional): true to also delete blob from storage
 */
export async function DELETE(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    const body = await req.json();
    const { productId, deleteBlob = false } = body;

    if (!productId) {
      console.error("[DELETE_IMAGE] Missing productId:", { vendorId });
      return NextResponse.json(
        { error: "Missing required parameter: productId" },
        { status: 400 }
      );
    }

    console.log("[DELETE_IMAGE] 🗑️ Request:", {
      vendorId,
      productId,
      deleteBlob,
    });

    // Find product by ID (vendor-scoped)
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
      console.error("[DELETE_IMAGE] ❌ NOT FOUND:", {
        vendorId,
        productId,
      });
      return NextResponse.json(
        { error: `Product not found for ID: ${productId}` },
        { status: 404 }
      );
    }

    const oldImageUrl = product.imageUrl;
    const hadImage = !!oldImageUrl;

    // Determine expected blob pathname for this product
    const expectedPathPattern = `vendors/${vendorId}/products/${productId}.`;

    // Set imageUrl to null in database
    await prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        imageUrl: null,
      },
    });

    console.log("[DELETE_IMAGE] 📝 DB Updated:", {
      vendorId,
      productId,
      productName: product.name,
      sku: product.sku || "NO SKU",
      hadImageUrl: hadImage,
      willDeleteBlob: deleteBlob && hadImage,
      expectedPathPattern,
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
            productId,
            productSku: product.sku || "NO SKU",
            url: oldImageUrl,
          });
        } else {
          console.warn("[DELETE_IMAGE] Skipping blob deletion (not vendor-scoped or not Vercel Blob):", {
            vendorId,
            productId,
            productSku: product.sku || "NO SKU",
            url: oldImageUrl,
            isVercelBlob,
            belongsToVendor,
          });
        }
      } catch (blobError: any) {
        // Log error but don't fail request - DB was updated successfully
        console.error("[DELETE_IMAGE] Blob deletion failed:", {
          vendorId,
          productId,
          productSku: product.sku || "NO SKU",
          url: oldImageUrl,
          error: blobError.message,
        });
      }
    }

    console.log("[DELETE_IMAGE] ✅ SUCCESS:", {
      vendorId,
      productId,
      productName: product.name,
      sku: product.sku || "NO SKU",
      dbImageUrlCleared: true,
      blobDeleted: deleteBlob && oldImageUrl,
    });

    return NextResponse.json({
      success: true,
      productId,
      sku: product.sku,
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
