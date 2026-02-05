/**
 * Cleanup Script for Ghost Cart Items
 * 
 * Removes cart items that have orphaned or invalid Product/Variant references.
 * 
 * Usage (dev only):
 *   npx ts-node scripts/cleanup-ghost-items.ts
 * 
 * This script:
 * 1. Finds all CartItem rows where productId doesn't exist in Product table
 * 2. Finds all CartItem rows where variantId is set but doesn't exist in ProductVariant table
 * 3. Deletes these ghost items
 * 4. Reports statistics
 * 
 * Root cause: Items were created with invalid productId or variantId due to bugs in:
 * - ProductCard passing product.id as variantId
 * - OfferingCard using mock offering IDs that don't map to Product table
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupGhostItems() {
  console.log("=== Cleanup Ghost Cart Items ===\n");

  try {
    // Find and delete CartItems with invalid productId
    console.log("1. Finding CartItems with missing Product references...");
    const allCartItems = await prisma.cartItem.findMany({
      include: {
        cart: { select: { userId: true } },
        product: true,
        variant: true,
      },
    });
    
    const itemsWithMissingProduct = allCartItems.filter((item) => !item.product);

    if (itemsWithMissingProduct.length > 0) {
      console.log(`   Found ${itemsWithMissingProduct.length} items with missing products:`);
      itemsWithMissingProduct.forEach((item) => {
        console.log(`     - CartItem ${item.id} (User: ${item.cart.userId}, productId: ${item.productId})`);
      });

      const deletedCount1 = await prisma.cartItem.deleteMany({
        where: {
          id: { in: itemsWithMissingProduct.map((i) => i.id) },
        },
      });
      console.log(`   ✓ Deleted ${deletedCount1.count} items\n`);
    } else {
      console.log("   No items with missing products found\n");
    }

    // Find and delete CartItems with invalid variantId
    console.log("2. Finding CartItems with orphaned Variant references...");
    const itemsWithMissingVariant = allCartItems.filter((item) => item.variantId && !item.variant);

    if (itemsWithMissingVariant.length > 0) {
      console.log(`   Found ${itemsWithMissingVariant.length} items with missing variants:`);
      itemsWithMissingVariant.forEach((item) => {
        console.log(`     - CartItem ${item.id} (User: ${item.cart.userId}, variantId: ${item.variantId})`);
      });

      const deletedCount2 = await prisma.cartItem.deleteMany({
        where: {
          id: { in: itemsWithMissingVariant.map((i) => i.id) },
        },
      });
      console.log(`   ✓ Deleted ${deletedCount2.count} items\n`);
    } else {
      console.log("   No items with missing variants found\n");
    }

    // Summary
    const totalGhostItems = itemsWithMissingProduct.length + itemsWithMissingVariant.length;
    console.log("=== Summary ===");
    console.log(`Total ghost items deleted: ${totalGhostItems}`);
    console.log("\nCleanup complete. Ghost items have been removed from all carts.");
    console.log("This should resolve:");
    console.log("  - Stuck items that cannot be deleted");
    console.log("  - Items showing as null/undefined in cart UI");
    console.log("  - False 'Cart is empty' during checkout");
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupGhostItems();
