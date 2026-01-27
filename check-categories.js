const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      active: true,
      inStock: true,
    },
  });
  
  console.log("Products and their categories:");
  products.forEach(p => {
    console.log(`- ${p.name}: category="${p.category}" (active: ${p.active}, inStock: ${p.inStock})`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
