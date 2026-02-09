import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/auth/requireVendor";
import { revalidatePath, revalidateTag } from "next/cache";
import { normalizeCategory } from "@/lib/vendor-categories";

function revalidateMarketplace(category: string, vendorId: string) {
  revalidateTag("products");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${category}`);
  revalidatePath(`/marketplace/${category}/${vendorId}`);
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { vendorId } = await requireVendor();

    const product = await prisma.product.findFirst({
      where: { id: params.id, vendorId },
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { allowedCategories: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const normalizedCategory = normalizeCategory(product.category);
    const normalizedAllowed = vendor.allowedCategories.map((value) => normalizeCategory(value));

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(normalizedCategory)) {
      return NextResponse.json({ error: "Category not allowed" }, { status: 403 });
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { published: false },
    });

    revalidateMarketplace(updated.category, updated.vendorId);

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
