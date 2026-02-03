const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const bloodTests = await prisma.product.count({ where: { category: 'BLOOD_TESTS' } });
    const activeBloodTests = await prisma.product.count({ where: { category: 'BLOOD_TESTS', isActive: true } });
    const activeVendors = await prisma.vendor.count({ where: { isActive: true } });
    const locations = await prisma.location.count();
    
    console.log('\n📊 DIAGNOSTIC RESULTS');
    console.log('=====================');
    console.log('Blood Test Products (total):', bloodTests);
    console.log('Blood Test Products (active):', activeBloodTests);
    console.log('Active Vendors:', activeVendors);
    console.log('Locations:', locations);
    
    if (bloodTests === 0) {
      console.log('\n❌ No blood test products exist!');
      process.exit(1);
    } else if (activeBloodTests === 0) {
      console.log('\n⚠️  Blood test products exist but none are active (isActive=true)');
      
      // Show some examples
      const examples = await prisma.product.findMany({
        where: { category: 'BLOOD_TESTS' },
        take: 3
      });
      examples.forEach(p => {
        console.log(`  - ${p.name} (active: ${p.isActive})`);
      });
    } else if (activeVendors === 0) {
      console.log('\n❌ No active vendors exist!');
      process.exit(1);
    } else {
      console.log('\n✅ Data looks good - checking vendor links...\n');
      
      const linkedProducts = await prisma.product.findMany({
        where: { category: 'BLOOD_TESTS', isActive: true },
        include: { vendor: true },
        take: 5
      });
      
      if (linkedProducts.length === 0) {
        console.log('❌ No active blood test products found!');
      } else {
        console.log('✅ Sample Blood Test Products:');
        linkedProducts.forEach(p => {
          const vendorName = p.vendor?.name || 'UNLINKED';
          const vendorActive = p.vendor?.isActive ? '✅' : '❌';
          console.log(`  - ${p.name}`);
          console.log(`    Vendor: ${vendorName} ${vendorActive}`);
          console.log(`    Vendor ID: ${p.vendorId}`);
        });
      }
    }
    
    // Check locations
    if (locations === 0) {
      console.log('\n⚠️  No locations configured!');
    } else {
      const locs = await prisma.location.findMany({ take: 3 });
      console.log(`\n📍 Sample Locations (${locations} total):`);
      locs.forEach(l => {
        console.log(`  - ${l.name} (active: ${l.isActive})`);
      });
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
