import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/auth/requireVendor";
import { isServiceCategory, isValidBookingUrl, normalizeCategory } from "@/lib/vendor-categories";
import { revalidatePath, revalidateTag } from "next/cache";
import { del } from "@vercel/blob";

function revalidateMarketplace(category: string, vendorId: string) {
  revalidateTag("products");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${category}`);
  revalidatePath(`/marketplace/${category}/${vendorId}`);
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { vendorId } = await requireVendor();
    const product = await prisma.product.findFirst({
      where: { id: params.id, vendorId },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error("[GET /api/vendor/products/[id]] Error:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden - No vendor account" }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { vendorId } = await requireVendor();
    const body = await request.json();

    const product = await prisma.product.findFirst({
      where: { id: params.id, vendorId },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const category = normalizeCategory(body.category || product.category);
    const isService = isServiceCategory(category);

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { allowedCategories: true, bookingUrl: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const normalizedAllowed = vendor.allowedCategories.map((value: string) => normalizeCategory(value));

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(category)) {
      return NextResponse.json({ error: "Category not allowed" }, { status: 403 });
    }

    const bookingUrl = body.bookingUrl ?? product.bookingUrl ?? null;
    const hasBookingUrl = !!bookingUrl || !!vendor.bookingUrl;

    if (isService) {
      if (bookingUrl && !isValidBookingUrl(bookingUrl)) {
        return NextResponse.json({ error: "Booking URL must be a valid Calendly, Acuity, Fresha, Square, or HTTPS link" }, { status: 400 });
      }
      if ((body.active ?? product.active) && !hasBookingUrl) {
        return NextResponse.json({ error: "Active services require a booking URL (set at product or vendor level)" }, { status: 400 });
      }
      if (body.variants?.length) {
        return NextResponse.json({ error: "Service items cannot have variants" }, { status: 400 });
      }
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        name: body.name ?? product.name,
        description: body.description ?? product.description,
        imageUrl: body.imageUrl ?? product.imageUrl,
        tags: Array.isArray(body.tags) ? body.tags : product.tags,
        category,
        priceFils: body.priceFils ?? product.priceFils,
        bookingUrl: isService ? bookingUrl : null,
        inventoryStatus: isService
          ? "in_stock"
          : body.inventoryStatus ?? product.inventoryStatus,
        inStock: isService ? true : body.inStock ?? product.inStock,
        active: body.active ?? product.active,
        published: body.published ?? product.published,
      },
    });

    if (isService) {
      await prisma.productVariant.updateMany({
        where: { productId: product.id },
        data: { active: false },
      });
    } else if (Array.isArray(body.variants)) {
      const incoming = body.variants as Array<any>;
      const incomingIds = incoming.filter((v) => v.id).map((v) => v.id);

      await prisma.$transaction([
        prisma.productVariant.updateMany({
          where: {
            productId: product.id,
            id: { notIn: incomingIds.length ? incomingIds : ["__none__"] },
          },
          data: { active: false },
        }),
        ...incoming
          .filter((variant) => variant.id)
          .map((variant) =>
            prisma.productVariant.updateMany({
              where: { id: variant.id, productId: product.id },
              data: {
                sku: variant.sku,
                strength: variant.strength,
                unitSize: variant.unitSize || null,
                priceFils: Number(variant.priceFils) || 0,
                active: variant.active !== false,
                inStock: variant.inStock !== false,
              },
            })
          ),
        ...(incoming.filter((variant) => !variant.id).length
          ? [
              prisma.productVariant.createMany({
                data: incoming
                  .filter((variant) => !variant.id)
                  .map((variant) => ({
                    productId: product.id,
                    sku: variant.sku,
                    strength: variant.strength,
                    unitSize: variant.unitSize || null,
                    priceFils: Number(variant.priceFils) || 0,
                    active: variant.active !== false,
                    inStock: variant.inStock !== false,
                  })),
              }),
            ]
          : []),
      ]);
    }

    revalidateMarketplace(updated.category, updated.vendorId);

    return NextResponse.json({ id: updated.id });
  } catch (error: any) {
    console.error("[PATCH /api/vendor/products/[id]] Error:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden - No vendor account" }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || "Failed to update item" }, { status: 500 });
  }
}

/**
 * DELETE /api/vendor/products/[id]
 *
 * Production-ready deletion with archive logic:
 * - If product has order history → archive (set active=false, published=false)
 * - If product has no order history → hard delete (delete variants, blob, product row)
 *
 * Safety:
 * - requireVendor() enforces authentication
 * - Product must belong to session vendorId
 * - Blob deletion only for vendor-owned paths
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { vendorId } = await requireVendor();

    // Verify product exists and belongs to this vendor
    const product = await prisma.product.findFirst({
      where: { id: params.id, vendorId },
      select: {
        id: true,
        vendorId: true,
        category: true,
        imageUrl: true,
        name: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product has order history (via OrderItem references)
    const orderItemCount = await prisma.orderItem.count({
      where: {
        OR: [
          { productId: product.id },
          {
            variantId: {
              in: await prisma.productVariant
                .findMany({
                  where: { productId: product.id },
                  select: { id: true },
                })
                .then(variants => variants.map(v => v.id))
            }
          }
        ]
      },
    });

    const hasOrderHistory = orderItemCount > 0;

    if (hasOrderHistory) {
      // ARCHIVE: Product has order history, cannot hard delete
      await prisma.product.update({
        where: { id: product.id },
        data: {
          active: false,
          published: false,
          inventoryStatus: "out",
          inStock: false,
        },
      });

      // Also deactivate all variants
      await prisma.productVariant.updateMany({
        where: { productId: product.id },
        data: { active: false, inStock: false },
      });

      revalidateMarketplace(product.category, product.vendorId);

      return NextResponse.json({
        success: true,
        action: "archived",
        message: "Product archived because it has order history",
      });
    } else {
      // HARD DELETE: Product has no order history, safe to delete

      // 1. Delete variants
      await prisma.productVariant.deleteMany({
        where: { productId: product.id },
      });

      // 2. Delete blob image if it exists and is vendor-owned
      if (product.imageUrl) {
        const isBlobUrl = product.imageUrl.includes("vercel-storage.com") ||
                         product.imageUrl.includes("blob.vercel-storage.com");
        const isVendorPath = product.imageUrl.includes(`vendors/${vendorId}/products/`);

        if (isBlobUrl && isVendorPath) {
          try {
            await del(product.imageUrl);
            console.log(`[DELETE] Deleted blob: ${product.imageUrl}`);
          } catch (blobError) {
            // Log but don't fail - blob might already be deleted
            console.warn(`[DELETE] Failed to delete blob (non-fatal):`, blobError);
          }
        }
      }

      // 3. Delete product row
      await prisma.product.delete({
        where: { id: product.id },
      });

      revalidateMarketplace(product.category, product.vendorId);

      return NextResponse.json({
        success: true,
        action: "deleted",
        message: "Product permanently deleted",
      });
    }
  } catch (error: any) {
    console.error("[DELETE /api/vendor/products/[id]] Error:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden - No vendor account" }, { status: 403 });
    }

    return NextResponse.json({
      error: error.message || "Failed to delete product",
      success: false,
    }, { status: 500 });
  }
}
