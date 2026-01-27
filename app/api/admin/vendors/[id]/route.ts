import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        products: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching vendor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
