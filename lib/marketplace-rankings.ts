import { prisma } from "@/lib/prisma";
import { isServiceCategory, normalizeCategory } from "@/lib/vendor-categories";
import type { MarketplaceEventType } from "@prisma/client";

const POPULAR_WEIGHTS: Record<MarketplaceEventType, number> = {
  PURCHASE: 10,
  ADD_TO_CART: 3,
  BOOK_CLICK: 3,
  VIEW: 1,
};

function buildScore(events: Record<MarketplaceEventType, number>) {
  return (
    (events.PURCHASE || 0) * POPULAR_WEIGHTS.PURCHASE +
    (events.ADD_TO_CART || 0) * POPULAR_WEIGHTS.ADD_TO_CART +
    (events.BOOK_CLICK || 0) * POPULAR_WEIGHTS.BOOK_CLICK +
    (events.VIEW || 0) * POPULAR_WEIGHTS.VIEW
  );
}

export async function getPopularNow(limit = 10) {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const grouped = await prisma.marketplaceEvent.groupBy({
    by: ["productId", "vendorId", "eventType"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const totals = new Map<
    string,
    { productId: string; vendorId: string; counts: Record<MarketplaceEventType, number> }
  >();

  for (const row of grouped) {
    const key = row.productId;
    if (!totals.has(key)) {
      totals.set(key, {
        productId: row.productId,
        vendorId: row.vendorId,
        counts: { VIEW: 0, ADD_TO_CART: 0, BOOK_CLICK: 0, PURCHASE: 0 },
      });
    }
    const entry = totals.get(key)!;
    entry.counts[row.eventType] = row._count._all;
  }

  const ranked = Array.from(totals.values())
    .map((entry) => ({
      ...entry,
      score: buildScore(entry.counts),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const productIds = ranked.map((item) => item.productId);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true, published: true },
    select: {
      id: true,
      vendorId: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      priceFils: true,
      imageUrl: true,
      inStock: true,
      inventoryStatus: true,
      calendlyUrl: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  return ranked
    .map((rankedItem) => productMap.get(rankedItem.productId))
    .filter(Boolean);
}

export async function getMostBooked(limit = 10) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const grouped = await prisma.marketplaceEvent.groupBy({
    by: ["productId", "vendorId", "eventType"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const totals = new Map<
    string,
    { productId: string; vendorId: string; counts: Record<MarketplaceEventType, number> }
  >();

  for (const row of grouped) {
    const key = row.productId;
    if (!totals.has(key)) {
      totals.set(key, {
        productId: row.productId,
        vendorId: row.vendorId,
        counts: { VIEW: 0, ADD_TO_CART: 0, BOOK_CLICK: 0, PURCHASE: 0 },
      });
    }
    const entry = totals.get(key)!;
    entry.counts[row.eventType] = row._count._all;
  }

  const productIds = Array.from(totals.keys());

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true, published: true },
    select: {
      id: true,
      vendorId: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      priceFils: true,
      imageUrl: true,
      inStock: true,
      inventoryStatus: true,
      calendlyUrl: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  const ranked = Array.from(totals.values())
    .map((entry) => {
      const product = productMap.get(entry.productId);
      if (!product) return null;
      const category = normalizeCategory(product.category);
      const isService = isServiceCategory(category);
      const primary = entry.counts.PURCHASE || 0;
      const secondary = isService
        ? entry.counts.BOOK_CLICK || 0
        : entry.counts.ADD_TO_CART || 0;
      const score = primary * 1000 + secondary;
      return { product, score };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)
    .slice(0, limit)
    .map((item) => item!.product);

  return ranked;
}
