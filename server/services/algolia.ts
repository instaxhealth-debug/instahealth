import "server-only";

/**
 * Algolia Service - Next.js Server Wrapper
 *
 * This file has the "server-only" guard for Next.js server code.
 * Re-exports the core indexer logic from lib/algolia/indexer.ts
 */

import { AlgoliaIndexer, type AlgoliaConfig, type ProductSearchObject } from "@/lib/algolia/indexer";
import { prisma } from "@/lib/prisma";

export type { ProductSearchObject };

const appId = process.env.ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_KEY;
const indexName = process.env.ALGOLIA_PRODUCTS_INDEX;

if (!appId || !adminKey || !indexName) {
  throw new Error("Missing ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, or ALGOLIA_PRODUCTS_INDEX");
}

const config: AlgoliaConfig = {
  appId,
  adminKey,
  indexName,
};

const indexer = new AlgoliaIndexer(config, prisma);

export async function upsertProductToAlgolia(productId: string): Promise<void> {
  return indexer.upsertProduct(productId);
}

export async function removeProductFromAlgolia(productId: string): Promise<void> {
  return indexer.removeProduct(productId);
}

export async function reindexAllProducts(): Promise<{ count: number; duration: number }> {
  return indexer.reindexAll();
}

export async function reindexProductsByIds(productIds: string[]): Promise<void> {
  return indexer.reindexByIds(productIds);
}
