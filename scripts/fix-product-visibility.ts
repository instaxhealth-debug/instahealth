import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing product visibility...");

  // Set all products to isGlobal=true to ensure they're visible
  const result = await prisma.product.updateMany({
    where: {
      active: true,
      inStock: true,
      isGlobal: false,
    },
    data: {
      isGlobal: true,
    },
  });

  console.log(`✅ Updated ${result.count} products to isGlobal=true`);
  console.log("All active+inStock products are now globally visible!");
}

main()
  .catch((err) => {
    console.error("Failed to fix products", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
