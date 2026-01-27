import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    await requireAdmin();

    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(vendors);
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching vendors:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, status } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate slug for vendor
    const { generateSlug, generateUniqueSlug } = await import("@/lib/utils/slug");
    const baseSlug = generateSlug(name.trim());
    const slug = await generateUniqueSlug(baseSlug, async (candidate) => {
      const existing = await prisma.vendor.findUnique({ where: { slug: candidate } });
      return !!existing;
    });

    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        slug,
        status: status || "active",
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating vendor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
