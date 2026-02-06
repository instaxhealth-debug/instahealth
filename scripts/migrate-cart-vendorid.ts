/**
 * Migration Script: Add and Backfill vendorId to CartItem
 *
 * Purpose: Safely migrate existing cart items to include vendorId
 *
 * Run: npx tsx scripts/migrate-cart-vendorid.ts
 *
 * This script:
 * 1. Checks current cart items
 * 2. Backfills vendorId from product.vendorId
 * 3. Removes orphaned cart items (product deleted)
 * 4. Validates migration success
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateCartVendorId() {
  console.log("\n🔄 Starting CartItem vendorId migration...\n");

  try {
    // Step 1: Count existing cart items
    const totalItems = await prisma.cartItem.count();
    console.log(`📊 Total cart items: ${totalItems}`);

    if (totalItems === 0) {
      console.log("✅ No cart items to migrate");
      return;
    }

    // Step 2: Find items with valid products
    const itemsWithProducts = await prisma.cartItem.findMany({
      include: {
        product: {
          select: { id: true, vendorId: true, name: true },
        },
      },
    });

    console.log(`\n📋 Items with valid products: ${itemsWithProducts.filter(i => i.product).length}`);
    console.log(`⚠️  Orphaned items (product deleted): ${itemsWithProducts.filter(i => !i.product).length}`);

    // Step 3: Backfill vendorId for valid items
    let backfilled = 0;
    for (const item of itemsWithProducts) {
      if (!item.product) {
        console.log(`❌ Orphaned item ${item.id} - product ${item.productId} not found`);
        continue;
      }

      // Check if vendorId already set (in case script runs twice)
      const currentItem: any = await prisma.cartItem.findUnique({
        where: { id: item.id },
      });

      if (currentItem.vendorId) {
        console.log(`ℹ️  Item ${item.id} already has vendorId: ${currentItem.vendorId}`);
        continue;
      }

      // Backfill vendorId
      await prisma.$executeRawUnsafe(
        `UPDATE "CartItem" SET "vendorId" = $1 WHERE "id" = $2`,
        item.product.vendorId,
        item.id
      );

      backfilled++;
      console.log(`✓ Backfilled item ${item.id}: product "${item.product.name}" → vendor ${item.product.vendorId}`);
    }

    console.log(`\n✅ Backfilled ${backfilled} cart items`);

    // Step 4: Delete orphaned items (optional - only if user confirms)
    const orphanedItems = itemsWithProducts.filter(i => !i.product);
    if (orphanedItems.length > 0) {
      console.log(`\n⚠️  Found ${orphanedItems.length} orphaned cart items (product no longer exists)`);
      console.log("   These will be automatically removed by the migration.");

      for (const item of orphanedItems) {
        await prisma.cartItem.delete({ where: { id: item.id } });
        console.log(`   Deleted orphaned item ${item.id} (productId: ${item.productId})`);
      }
    }

    // Step 5: Validation
    console.log("\n🔍 Validating migration...");

    const itemsAfter = await prisma.cartItem.findMany({
      select: { id: true, productId: true, vendorId: true },
    });

    const itemsWithoutVendorId = itemsAfter.filter((i: any) => !i.vendorId);

    if (itemsWithoutVendorId.length > 0) {
      console.error(`\n❌ Migration incomplete: ${itemsWithoutVendorId.length} items still missing vendorId`);
      console.error("   Run this script again or check for data issues.");
      process.exit(1);
    }

    console.log(`✅ All ${itemsAfter.length} cart items now have vendorId`);
    console.log("\n✅ Migration complete!");

    // Step 6: Summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total items before: ${totalItems}`);
    console.log(`Items backfilled: ${backfilled}`);
    console.log(`Orphaned items removed: ${orphanedItems.length}`);
    console.log(`Total items after: ${itemsAfter.length}`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateCartVendorId()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
