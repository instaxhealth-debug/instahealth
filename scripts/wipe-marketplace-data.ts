/**
 * Wipe marketplace data - vendors, products, vendor applications
 *
 * DANGER: This script will DELETE all marketplace data!
 * Use ONLY for resetting marketplace to clean state
 *
 * Usage:
 *   LOCAL:  npm run wipe-marketplace
 *   PROD:   DATABASE_URL="<prod-url>" npm run wipe-marketplace
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const environment = process.env.NODE_ENV || 'development';
  const dbUrl = process.env.DATABASE_URL || '';

  console.log('\n='.repeat(60));
  console.log('⚠️  MARKETPLACE DATA WIPE SCRIPT');
  console.log('='.repeat(60));
  console.log(`Environment: ${environment}`);
  console.log(`Database: ${dbUrl.substring(0, 50)}...`);
  console.log('='.repeat(60));

  // Safety check for production
  if (dbUrl.includes('prod') || dbUrl.includes('production') || environment === 'production') {
    console.log('\n🔴 PRODUCTION DATABASE DETECTED!');
    console.log('This script will DELETE ALL marketplace data:');
    console.log('  - All products');
    console.log('  - All vendors');
    console.log('  - All vendor applications');
    console.log('  - All vendor invites');
    console.log('');
    console.log('To proceed, you must explicitly confirm.');
    console.log('Export CONFIRM_WIPE=yes and run again.');

    if (process.env.CONFIRM_WIPE !== 'yes') {
      console.log('\n❌ Aborting - CONFIRM_WIPE not set\n');
      process.exit(1);
    }
  }

  console.log('\n🗑️  Starting marketplace data wipe...\n');

  try {
    // Step 1: Delete all cart items
    console.log('[1/12] Deleting all cart items...');
    const deletedCartItems = await prisma.cartItem.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCartItems.count} cart items`);

    // Step 2: Delete all vendor order items
    console.log('[2/12] Deleting all vendor order items...');
    const deletedVendorOrderItems = await prisma.vendorOrderItem.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVendorOrderItems.count} vendor order items`);

    // Step 3: Delete all order items
    console.log('[3/12] Deleting all order items...');
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`   ✅ Deleted ${deletedOrderItems.count} order items`);

    // Step 4: Delete all vendor orders
    console.log('[4/12] Deleting all vendor orders...');
    const deletedVendorOrders = await prisma.vendorOrder.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVendorOrders.count} vendor orders`);

    // Step 5: Delete all vendor payouts
    console.log('[5/12] Deleting all vendor payouts...');
    const deletedVendorPayouts = await prisma.vendorPayout.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVendorPayouts.count} vendor payouts`);

    // Step 6: Delete all product locations
    console.log('[6/12] Deleting all product locations...');
    const deletedProductLocations = await prisma.productLocation.deleteMany({});
    console.log(`   ✅ Deleted ${deletedProductLocations.count} product locations`);

    // Step 7: Delete all product variants
    console.log('[7/12] Deleting all product variants...');
    const deletedVariants = await prisma.productVariant.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVariants.count} product variants`);

    // Step 8: Delete all marketplace events
    console.log('[8/12] Deleting all marketplace events...');
    const deletedEvents = await prisma.marketplaceEvent.deleteMany({});
    console.log(`   ✅ Deleted ${deletedEvents.count} marketplace events`);

    // Step 9: Delete all products
    console.log('[9/12] Deleting all products...');
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`   ✅ Deleted ${deletedProducts.count} products`);

    // Step 10: Delete all vendor applications
    console.log('[10/12] Deleting all vendor applications...');
    const deletedApplications = await prisma.vendorApplication.deleteMany({});
    console.log(`   ✅ Deleted ${deletedApplications.count} vendor applications`);

    // Step 11: Delete all vendor invites
    console.log('[11/12] Deleting all vendor invites...');
    const deletedInvites = await prisma.vendorInvite.deleteMany({});
    console.log(`   ✅ Deleted ${deletedInvites.count} vendor invites`);

    // Step 12: Delete all vendors
    console.log('[12/12] Deleting all vendors...');
    const deletedVendors = await prisma.vendor.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVendors.count} vendors`);

    console.log('\n✅ Marketplace data wipe complete!\n');
    console.log('Next steps:');
    console.log('  1. Navigate to /vendor/apply');
    console.log('  2. Submit application with logo + categories');
    console.log('  3. Admin approves in /admin/vendor-applications');
    console.log('  4. Vendor card appears in chosen categories');
    console.log('  5. Card shows "Coming soon" until products added\n');
  } catch (error) {
    console.error('\n❌ Error during wipe:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
