import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { 
      name: true, 
      category: true, 
      active: true, 
      inStock: true, 
      isGlobal: true, 
      published: true,
      vendor: { 
        select: { name: true, status: true } 
      }
    }
  });
  
  console.log('\n📦 All Products:');
  console.log(JSON.stringify(products, null, 2));
  
  await prisma.$disconnect();
}

main();
