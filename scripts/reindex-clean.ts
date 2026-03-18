#!/usr/bin/env tsx
/**
 * Clean Algolia Reindex Script
 *
 * This script clears the Algolia index and rebuilds it from scratch
 * with ONLY active, published products from active vendors.
 *
 * Usage:
 *   npx tsx scripts/reindex-clean.ts
 */

import { AlgoliaIndexer } from "../lib/algolia/indexer";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const appId = process.env.ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_KEY;
const indexName = process.env.ALGOLIA_PRODUCTS_INDEX;

if (!appId || !adminKey || !indexName) {
  throw new Error("Missing ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, or ALGOLIA_PRODUCTS_INDEX");
}

async function main() {
  console.log("🧹 Clean Algolia Reindex Starting...\n");

  // Initialize Prisma client
  const prisma = new PrismaClient();

  // Initialize Algolia indexer
  const indexer = new AlgoliaIndexer(
    { appId: appId!, adminKey: adminKey!, indexName: indexName! },
    prisma
  );

  try {
    // Step 1: Clear the index
    console.log("Step 1/3: Clearing Algolia index...");
    await indexer.clearIndex();
    console.log("✅ Index cleared\n");

    // Step 2: Reindex all products (now filtered by active + published)
    console.log("Step 2/3: Reindexing products (active + published only)...");
    const result = await indexer.reindexAll();
    console.log(`✅ Indexed ${result.count} products in ${result.duration}ms\n`);

    // Step 3: Verify index settings
    console.log("Step 3/3: Verifying index settings...");
    const settings = await indexer.getSettings();
    console.log("✅ Index settings:");
    console.log(`   - Searchable attributes: ${settings.searchableAttributes?.join(", ")}`);
    console.log(`   - Filterable attributes: ${settings.attributesForFaceting?.length || 0}`);
    console.log(`   - Custom ranking: ${settings.customRanking?.join(", ")}\n`);

    console.log("🎉 Clean reindex complete!");
    console.log(`\n📊 Summary:`);
    console.log(`   - Total products indexed: ${result.count}`);
    console.log(`   - Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   - Index: ${indexName}`);
    console.log(`\n✅ Search results will now show ONLY active, published products from active vendors.`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Reindex failed:", error);
    process.exit(1);
  });
