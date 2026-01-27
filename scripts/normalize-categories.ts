// One-time script to normalize existing product categories to canonical slugs
import { PrismaClient } from "@prisma/client";
import { normalizeCategory } from "../lib/utils/category";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Normalizing product categories to canonical slugs...");

  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true },
  });

  let updated = 0;
  let unchanged = 0;

  for (const product of products) {
    const normalized = normalizeCategory(product.category);
    if (normalized !== product.category) {
      await prisma.product.update({
        where: { id: product.id },
        data: { category: normalized },
      });
      console.log(`✅ ${product.name}: "${product.category}" → "${normalized}"`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n✨ Done! Updated ${updated} products, ${unchanged} already normalized.`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
