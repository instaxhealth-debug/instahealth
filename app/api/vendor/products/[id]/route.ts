import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/auth/requireVendor";
import { isServiceCategory, isValidCalendlyUrl, normalizeCategory } from "@/lib/vendor-categories";
import { revalidatePath, revalidateTag } from "next/cache";

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
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      select: { allowedCategories: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const normalizedAllowed = vendor.allowedCategories.map((value: string) => normalizeCategory(value));

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(category)) {
      return NextResponse.json({ error: "Category not allowed" }, { status: 403 });
    }

    const calendlyUrl = body.calendlyUrl ?? product.calendlyUrl ?? null;

    if (isService) {
      if (calendlyUrl && !isValidCalendlyUrl(calendlyUrl)) {
        return NextResponse.json({ error: "Calendly URL must start with https://calendly.com/" }, { status: 400 });
      }
      if ((body.active ?? product.active) && !calendlyUrl) {
        return NextResponse.json({ error: "Active services require a Calendly URL" }, { status: 400 });
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
        calendlyUrl: isService ? calendlyUrl : null,
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
    return NextResponse.json({ error: error.message || "Failed to update item" }, { status: 500 });
  }
}
