import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { generateSlug } from "@/lib/utils/slug";
import { aedToFils } from "@/lib/utils/price";
import { normalizeCategory } from "@/lib/utils/category";
import { upsertProductToAlgolia } from "@/server/services/algolia";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { vendorId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, category, price, imageUrl, inStock, active } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!category || typeof category !== "string" || category.trim().length === 0) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    if (!price || (typeof price !== "number" && typeof price !== "string")) {
      return NextResponse.json({ error: "Price is required" }, { status: 400 });
    }

    const priceNum = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
    }

    // Generate unique slug
    const baseSlug = generateSlug(name.trim());
    let slug = baseSlug;
    let counter = 1;
    let existing = await prisma.product.findUnique({ where: { slug } });
    while (existing) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      existing = await prisma.product.findUnique({ where: { slug } });
    }

    // Convert AED to fils
    const priceFils = aedToFils(priceNum);

    // Create product with slug hardening (retry once on unique constraint error)
    let product;
    try {
      product = await prisma.product.create({
        data: {
          vendorId: params.id,
          name: name.trim(),
          slug: slug,
          description: description?.trim() || null,
          category: normalizeCategory(category.trim()),
          priceFils: priceFils,
          imageUrl: imageUrl?.trim() || null,
          inStock: inStock !== undefined ? Boolean(inStock) : true,
          active: active !== undefined ? Boolean(active) : true,
        },
      });
    } catch (createError: any) {
      // Handle unique constraint violation on slug (race condition)
      if (createError.code === 'P2002' && createError.meta?.target?.includes('slug')) {
        // Generate new slug with timestamp suffix and retry once
        const timestamp = Date.now();
        slug = `${baseSlug}-${timestamp}`;
        
        product = await prisma.product.create({
          data: {
            vendorId: params.id,
            name: name.trim(),
            slug: slug,
            description: description?.trim() || null,
            category: normalizeCategory(category.trim()),
            priceFils: priceFils,
            imageUrl: imageUrl?.trim() || null,
            inStock: inStock !== undefined ? Boolean(inStock) : true,
            active: active !== undefined ? Boolean(active) : true,
          },
        });
      } else {
        // Re-throw other errors
        throw createError;
      }
    }

    await upsertProductToAlgolia(product.id);

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
