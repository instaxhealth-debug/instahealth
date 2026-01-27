"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

export async function fixProductVisibility() {
  await requireAdmin();

  const result = await prisma.product.updateMany({
    where: {
      active: true,
      inStock: true,
      isGlobal: false,
      locations: {
        none: {},
      },
    },
    data: {
      isGlobal: true,
    },
  });

  revalidatePath("/admin/health");
  revalidatePath("/marketplace");

  return {
    success: true,
    count: result.count,
  };
}
