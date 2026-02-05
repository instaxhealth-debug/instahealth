import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const vendorCount = await prisma.vendor.count();
    const productCount = await prisma.product.count();
    
    const vendors = await prisma.vendor.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        verified: true,
        _count: {
          select: { products: true }
        }
      }
    });
    
    const products = await prisma.product.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        category: true,
        active: true,
        inStock: true,
        isGlobal: true,
        vendor: {
          select: { name: true, status: true }
        }
      }
    });
    
    console.log(`\n📊 Database Status:`);
    console.log(`Total vendors: ${vendorCount}`);
    console.log(`Total products: ${productCount}`);
    
    if (vendors.length > 0) {
      console.log(`\n🏪 Sample Vendors:`);
      vendors.forEach(v => {
        console.log(`  - ${v.name} (${v.slug}) | status: ${v.status} | verified: ${v.verified} | products: ${v._count.products}`);
      });
    }
    
    if (products.length > 0) {
      console.log(`\n📦 Sample Products:`);
      products.forEach(p => {
        console.log(`  - ${p.name} (${p.category}) | vendor: ${p.vendor.name} (${p.vendor.status}) | active: ${p.active} | inStock: ${p.inStock} | global: ${p.isGlobal}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
