import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/auth/requireVendor";
import { isServiceCategory, isValidCalendlyUrl, normalizeCategory } from "@/lib/vendor-categories";
import { isValidCategorySlug, formatAllowedCategories, CATEGORY_SLUGS } from "@/lib/utils/category";
import { slugify } from "@/lib/slugify";
import { revalidatePath, revalidateTag } from "next/cache";
import crypto from "crypto";

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
  } catch (error: any) {
    console.error("[GET /api/vendor/products] Error:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden - No vendor account" }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { vendorId } = await requireVendor();
    const body = await request.json();

    const fieldErrors: Record<string, string[]> = {};

    if (!body?.name || String(body.name).trim().length === 0) {
      fieldErrors.name = ["Name is required"];
    }

    if (!body?.category || String(body.category).trim().length === 0) {
      fieldErrors.category = ["Category is required"];
    }

    const priceFils = Number(body?.priceFils);
    if (Number.isNaN(priceFils)) {
      fieldErrors.priceFils = ["Price is required"];
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          requestId,
          message: "Validation failed",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { allowedCategories: true },
    });

    if (!vendor) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          requestId,
          message: "Vendor not found",
        },
        { status: 404 }
      );
    }

    const normalizedCategory = normalizeCategory(body.category);

    // Enforce canonical slug — reject unknown categories
    if (!isValidCategorySlug(normalizedCategory)) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          requestId,
          message: `Unknown category '${body.category}'. Allowed: ${formatAllowedCategories(vendor.allowedCategories.length > 0 ? vendor.allowedCategories : Object.values(CATEGORY_SLUGS))}`,
          fieldErrors: { category: [`Unknown category '${body.category}'`] },
        },
        { status: 400 }
      );
    }

    const normalizedAllowed = vendor.allowedCategories.map((category: string) => normalizeCategory(category));

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(normalizedCategory)) {
      return NextResponse.json(
        {
          ok: false,
          code: "FORBIDDEN",
          requestId,
          message: `Category '${normalizedCategory}' is not allowed for your vendor. Allowed: ${formatAllowedCategories(vendor.allowedCategories)}`,
          fieldErrors: { category: ["Category not allowed for your vendor"] },
        },
        { status: 403 }
      );
    }

    const isService = isServiceCategory(normalizedCategory);
    const calendlyUrl = body.calendlyUrl || null;

    if (isService) {
      if (calendlyUrl && !isValidCalendlyUrl(calendlyUrl)) {
        return NextResponse.json(
          {
            ok: false,
            code: "VALIDATION_ERROR",
            requestId,
            message: "Calendly URL must start with https://calendly.com/",
            fieldErrors: { calendlyUrl: ["Calendly URL must start with https://calendly.com/"] },
          },
          { status: 400 }
        );
      }
      if (body.active && !calendlyUrl) {
        return NextResponse.json(
          {
            ok: false,
            code: "VALIDATION_ERROR",
            requestId,
            message: "Active services require a Calendly URL",
            fieldErrors: { calendlyUrl: ["Active services require a Calendly URL"] },
          },
          { status: 400 }
        );
      }
      if (body.variants?.length) {
        return NextResponse.json(
          {
            ok: false,
            code: "VALIDATION_ERROR",
            requestId,
            message: "Service items cannot have variants",
            fieldErrors: { variants: ["Service items cannot have variants"] },
          },
          { status: 400 }
        );
      }
    }

    const baseSlug = slugify(body.name);
    if (!baseSlug) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          requestId,
          message: "Invalid product name",
          fieldErrors: { name: ["Invalid product name"] },
        },
        { status: 400 }
      );
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

    return NextResponse.json({ ok: true, id: product.id, requestId });
  } catch (error: any) {
    console.error("[POST /api/vendor/products] Error:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", requestId, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", requestId, message: "Forbidden - No vendor account" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        requestId,
        message: error.message || "Failed to create item",
      },
      { status: 500 }
    );
  }
}
