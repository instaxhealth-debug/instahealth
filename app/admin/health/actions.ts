"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { reindexProductsByIds } from "@/server/services/algolia";

export async function fixProductVisibility() {
  await requireAdmin();

  const affected = await prisma.product.findMany({
    where: {
      active: true,
      inStock: true,
      isGlobal: false,
      locations: {
        none: {},
      },
    },
    select: { id: true },
  });

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

  await reindexProductsByIds(affected.map((p) => p.id));

  revalidatePath("/admin/health");
  revalidatePath("/marketplace");

  return {
    success: true,
    count: result.count,
  };
}
