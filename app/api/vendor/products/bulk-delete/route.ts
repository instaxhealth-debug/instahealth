import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

interface BulkDeleteRequest {
  productIds: string[];
}

interface ProductResult {
  productId: string;
  action: "deleted" | "archived" | "failed";
  error?: string;
}

export async function POST(request: Request) {
  try {
    const { vendorId } = await requireVendor();

    const body: BulkDeleteRequest = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "productIds array is required" },
        { status: 400 }
      );
    }

    // Limit batch size for safety
    if (productIds.length > 100) {
      return NextResponse.json(
        { error: "Cannot delete more than 100 products at once" },
        { status: 400 }
      );
    }

    const results: ProductResult[] = [];
    let deleted = 0;
    let archived = 0;
    let failed = 0;

    // Process each product
    for (const productId of productIds) {
      try {
        // Verify product belongs to vendor
        const product = await prisma.product.findFirst({
          where: {
            id: productId,
            vendorId,
          },
          select: {
            id: true,
            imageUrl: true,
          },
        });

        if (!product) {
          results.push({
            productId,
            action: "failed",
            error: "Product not found or unauthorized",
          });
          failed++;
          continue;
        }

        // Get all variant IDs for this product
        const variants = await prisma.productVariant.findMany({
          where: { productId: product.id },
          select: { id: true },
        });

        const variantIds = variants.map((v) => v.id);

        // Check if product or any variants have order history
        const orderItemCount = await prisma.orderItem.count({
          where: {
            OR: [
              { productId: product.id },
              ...(variantIds.length > 0 ? [{ variantId: { in: variantIds } }] : []),
            ],
          },
        });

        const hasOrderHistory = orderItemCount > 0;

        if (hasOrderHistory) {
          // ARCHIVE: Product has order history
          await prisma.product.update({
            where: { id: product.id },
            data: {
              active: false,
              published: false,
              inventoryStatus: "out",
            },
          });

          results.push({
            productId,
            action: "archived",
          });
          archived++;
        } else {
          // DELETE: No order history, safe to delete permanently

          // Delete all variants first (cascade should handle this, but explicit is safer)
          if (variantIds.length > 0) {
            await prisma.productVariant.deleteMany({
              where: { productId: product.id },
            });
          }

          // Safe blob deletion: only delete if imageUrl is from vendor's blob path
          if (product.imageUrl && product.imageUrl.includes("blob.vercel-storage.com")) {
            try {
              await del(product.imageUrl);
            } catch (blobError) {
              console.error(`[BULK_DELETE] Failed to delete blob for product ${product.id}:`, blobError);
              // Continue with product deletion even if blob deletion fails
            }
          }

          // Delete the product
          await prisma.product.delete({
            where: { id: product.id },
          });

          results.push({
            productId,
            action: "deleted",
          });
          deleted++;
        }
      } catch (error) {
        console.error(`[BULK_DELETE] Error processing product ${productId}:`, error);
        results.push({
          productId,
          action: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failed++;
      }
    }

    return NextResponse.json({
      deleted,
      archived,
      failed,
      results,
    });
  } catch (error) {
    console.error("[BULK_DELETE] Error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete products" },
      { status: 500 }
    );
  }
}
