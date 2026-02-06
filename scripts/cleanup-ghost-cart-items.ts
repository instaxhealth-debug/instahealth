/**
 * Cleanup Script: Remove Ghost Cart Items
 *
 * Purpose: Identify and remove CartItems with invalid foreign key references
 * - Items pointing to non-existent products
 * - Items pointing to non-existent variants
 * - Items with variants that don't belong to their product
 *
 * Run with: npx tsx scripts/cleanup-ghost-cart-items.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface GhostItemReport {
  total: number;
  invalidProduct: number;
  invalidVariant: number;
  variantProductMismatch: number;
  deleted: number;
  cartIds: string[];
}

async function cleanupGhostCartItems(dryRun: boolean = true): Promise<GhostItemReport> {
  console.log(`\n🔍 Starting ghost cart item cleanup (${dryRun ? 'DRY RUN' : 'LIVE RUN'})...\n`);

  const report: GhostItemReport = {
    total: 0,
    invalidProduct: 0,
    invalidVariant: 0,
    variantProductMismatch: 0,
    deleted: 0,
    cartIds: [],
  };

  // Fetch all cart items with their relations
  const allItems = await prisma.cartItem.findMany({
    include: {
      product: true,
      variant: true,
      cart: true,
    },
  });

  report.total = allItems.length;
  console.log(`📊 Total cart items found: ${report.total}`);

  const ghostItems: string[] = [];

  for (const item of allItems) {
    let isGhost = false;
    let reason = "";

    // Check 1: Product doesn't exist
    if (!item.product) {
      isGhost = true;
      reason = `Invalid product reference (productId: ${item.productId})`;
      report.invalidProduct++;
    }
    // Check 2: Variant specified but doesn't exist
    else if (item.variantId && !item.variant) {
      isGhost = true;
      reason = `Invalid variant reference (variantId: ${item.variantId})`;
      report.invalidVariant++;
    }
    // Check 3: Variant exists but doesn't belong to product
    else if (item.variantId && item.variant && item.variant.productId !== item.productId) {
      isGhost = true;
      reason = `Variant/Product mismatch (variantId: ${item.variantId} belongs to ${item.variant.productId}, not ${item.productId})`;
      report.variantProductMismatch++;
    }

    if (isGhost) {
      ghostItems.push(item.id);
      console.log(`❌ Ghost item found: ${item.id}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Cart: ${item.cartId} (User: ${item.cart.userId || 'guest'})`);
      console.log(`   Product: ${item.productId} | Variant: ${item.variantId || 'none'}`);

      if (!report.cartIds.includes(item.cartId)) {
        report.cartIds.push(item.cartId);
      }
    }
  }

  console.log(`\n📈 Ghost items breakdown:`);
  console.log(`   - Invalid product references: ${report.invalidProduct}`);
  console.log(`   - Invalid variant references: ${report.invalidVariant}`);
  console.log(`   - Variant/product mismatches: ${report.variantProductMismatch}`);
  console.log(`   - Total ghost items: ${ghostItems.length}`);
  console.log(`   - Affected carts: ${report.cartIds.length}`);

  if (!dryRun && ghostItems.length > 0) {
    console.log(`\n🗑️  Deleting ${ghostItems.length} ghost items...`);
    const deleteResult = await prisma.cartItem.deleteMany({
      where: {
        id: {
          in: ghostItems,
        },
      },
    });
    report.deleted = deleteResult.count;
    console.log(`✅ Deleted ${report.deleted} ghost items`);
  } else if (ghostItems.length > 0) {
    console.log(`\n⚠️  DRY RUN: Would delete ${ghostItems.length} items`);
    console.log(`   Run with --live to actually delete these items`);
  } else {
    console.log(`\n✅ No ghost items found - cart is clean!`);
  }

  return report;
}

async function validateCartIntegrity() {
  console.log(`\n🔍 Validating cart integrity...\n`);

  // Check for orphaned carts (user deleted but cart remains)
  const orphanedCarts = await prisma.cart.findMany({
    where: {
      userId: {
        not: null,
      },
    },
    include: {
      user: true,
    },
  });

  const actualOrphans = orphanedCarts.filter(cart => !cart.user);

  if (actualOrphans.length > 0) {
    console.log(`⚠️  Found ${actualOrphans.length} orphaned carts (user deleted)`);
    for (const cart of actualOrphans) {
      console.log(`   - Cart ${cart.id} (userId: ${cart.userId})`);
    }
  } else {
    console.log(`✅ No orphaned carts found`);
  }

  // Check for duplicate cart items (same cart + product + variant)
  const allItems = await prisma.cartItem.findMany({
    orderBy: [
      { cartId: 'asc' },
      { productId: 'asc' },
      { variantId: 'asc' },
    ],
  });

  const duplicates: { cartId: string; productId: string; variantId: string | null; count: number }[] = [];
  const seen = new Map<string, number>();

  for (const item of allItems) {
    const key = `${item.cartId}:${item.productId}:${item.variantId || 'null'}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }

  for (const [key, count] of seen.entries()) {
    if (count > 1) {
      const [cartId, productId, variantId] = key.split(':');
      duplicates.push({
        cartId,
        productId,
        variantId: variantId === 'null' ? null : variantId,
        count,
      });
    }
  }

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicate cart item sets`);
    for (const dup of duplicates) {
      console.log(`   - Cart ${dup.cartId}: ${dup.count} copies of product ${dup.productId} variant ${dup.variantId || 'none'}`);
    }
  } else {
    console.log(`✅ No duplicate cart items found`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isLiveRun = args.includes('--live');

  try {
    // Step 1: Cleanup ghost items
    const report = await cleanupGhostCartItems(!isLiveRun);

    // Step 2: Validate integrity
    await validateCartIntegrity();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 CLEANUP SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total cart items: ${report.total}`);
    console.log(`Ghost items found: ${report.invalidProduct + report.invalidVariant + report.variantProductMismatch}`);
    if (isLiveRun) {
      console.log(`Items deleted: ${report.deleted}`);
    }
    console.log(`Affected carts: ${report.cartIds.length}`);
    console.log(`${'='.repeat(60)}\n`);

    if (!isLiveRun && (report.invalidProduct + report.invalidVariant + report.variantProductMismatch) > 0) {
      console.log(`💡 This was a dry run. To actually delete ghost items, run:`);
      console.log(`   npx tsx scripts/cleanup-ghost-cart-items.ts --live\n`);
    }

  } catch (error) {
    console.error(`\n❌ Error during cleanup:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
