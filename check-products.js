const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: {
      vendor: true,
      variants: true,
    },
    take: 3,
  });
  console.log(JSON.stringify(products, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
