import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vendor = await prisma.vendor.findUnique({
    where: { slug: "mydoctorhealthcare" },
    include: { products: true },
  });

  if (!vendor) {
    console.error("Vendor not found");
    return;
  }

  // Keep only the blood-tests product, delete others
  const productsToDelete = vendor.products.filter((p) => p.category !== "blood-tests");

  for (const product of productsToDelete) {
    await prisma.product.delete({ where: { id: product.id } });
    console.log(`🗑️ Deleted: ${product.name}`);
  }

  // Verify final state
  const final = await prisma.vendor.findUnique({
    where: { slug: "mydoctorhealthcare" },
    include: { products: true },
  });

  console.log(`\n✅ Final products for ${final?.name}:`);
  for (const p of final?.products || []) {
    console.log(`   - ${p.name} (${p.category})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
