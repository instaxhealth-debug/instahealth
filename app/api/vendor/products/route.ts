import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/auth/requireVendor";
import { isServiceCategory, isValidCalendlyUrl, normalizeCategory } from "@/lib/vendor-categories";
import { slugify } from "@/lib/slugify";
import { revalidatePath, revalidateTag } from "next/cache";

function revalidateMarketplace(category: string, vendorId: string) {
  revalidateTag("products");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${category}`);
  revalidatePath(`/marketplace/${category}/${vendorId}`);
}

export async function GET(request: Request) {
  try {
    const { vendorId } = await requireVendor();
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();

    const products = await prisma.product.findMany({
      where: {
        vendorId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { vendorId } = await requireVendor();
    const body = await request.json();

    if (!body?.name || !body?.category) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { allowedCategories: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const normalizedCategory = normalizeCategory(body.category);

    const normalizedAllowed = vendor.allowedCategories.map((category: string) => normalizeCategory(category));

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(normalizedCategory)) {
      return NextResponse.json({ error: "Category not allowed" }, { status: 403 });
    }

    const isService = isServiceCategory(normalizedCategory);
    const calendlyUrl = body.calendlyUrl || null;

    if (isService) {
      if (calendlyUrl && !isValidCalendlyUrl(calendlyUrl)) {
        return NextResponse.json({ error: "Calendly URL must start with https://calendly.com/" }, { status: 400 });
      }
      if (body.active && !calendlyUrl) {
        return NextResponse.json({ error: "Active services require a Calendly URL" }, { status: 400 });
      }
      if (body.variants?.length) {
        return NextResponse.json({ error: "Service items cannot have variants" }, { status: 400 });
      }
    }

    const baseSlug = slugify(body.name);
    if (!baseSlug) {
      return NextResponse.json({ error: "Invalid product name" }, { status: 400 });
    }

    let slug = baseSlug;
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const product = await prisma.product.create({
      data: {
        vendorId,
        name: body.name,
        slug,
        description: body.description || null,
        category: normalizedCategory,
        priceFils: Number(body.priceFils) || 0,
        imageUrl: body.imageUrl || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        calendlyUrl: isService ? calendlyUrl : null,
        inventoryStatus: isService ? "in_stock" : body.inventoryStatus || "in_stock",
        inStock: isService ? true : Boolean(body.inStock),
        active: body.active !== false,
        published: Boolean(body.published),
      },
    });

    if (!isService && Array.isArray(body.variants) && body.variants.length > 0) {
      await prisma.productVariant.createMany({
        data: body.variants.map((variant: any) => ({
          productId: product.id,
          sku: variant.sku,
          strength: variant.strength,
          unitSize: variant.unitSize || null,
          priceFils: Number(variant.priceFils) || 0,
          active: variant.active !== false,
          inStock: variant.inStock !== false,
        })),
      });
    }

    revalidateMarketplace(product.category, product.vendorId);

    return NextResponse.json({ id: product.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create item" }, { status: 500 });
  }
}
