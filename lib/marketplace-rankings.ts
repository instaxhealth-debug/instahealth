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
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days for "Popular Now"

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

  // Fallback: if insufficient event data, use recently added + in-stock products
  if (ranked.length < limit) {
    const fallbackProducts = await prisma.product.findMany({
      where: {
        active: true,
        published: true,
        inStock: true,
        vendor: {
          status: "active",
        },
      },
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
        bookingUrl: true,
        vendor: {
          select: { bookingUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (ranked.length === 0) {
      return fallbackProducts;
    }

    // Merge: prioritize ranked items, fill remaining with fallback
    const rankedIds = new Set(ranked.map((item) => item.productId));
    const additionalProducts = fallbackProducts
      .filter((p) => !rankedIds.has(p.id))
      .slice(0, limit - ranked.length);

    const productIds = [...ranked.map((item) => item.productId)];

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
        bookingUrl: true,
        vendor: {
          select: { bookingUrl: true },
        },
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    const rankedProducts = ranked
      .map((rankedItem) => productMap.get(rankedItem.productId))
      .filter(Boolean);

    return [...rankedProducts, ...additionalProducts];
  }

  const productIds = ranked.map((item) => item.productId);

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      active: true,
      published: true,
      vendor: {
        status: "active",
      },
    },
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
      bookingUrl: true,
        vendor: {
          select: { bookingUrl: true },
        },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  return ranked
    .map((rankedItem) => productMap.get(rankedItem.productId))
    .filter(Boolean);
}

export async function getMostBooked(limit = 10) {
  // Use actual OrderItem data to find most purchased products (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Aggregate total quantity purchased per product from OrderItems
  // Exclude terminal failure states: CANCELLED, REFUNDED, FAILED
  const orderStats = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        createdAt: { gte: since },
        status: { in: ["PAID", "FULFILLING", "PROCESSING", "COMPLETED", "SHIPPED"] }, // Only successful orders
        NOT: {
          status: { in: ["CANCELLED", "REFUNDED", "FAILED"] },
        },
      },
    },
    _sum: {
      quantity: true,
    },
    _count: {
      id: true, // Number of order items (different from quantity)
    },
  });

  // Sort by total quantity purchased
  const ranked = orderStats
    .map((stat) => ({
      productId: stat.productId,
      totalQuantity: stat._sum.quantity || 0,
      orderCount: stat._count.id,
    }))
    .filter((stat) => stat.totalQuantity > 0)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);

  if (ranked.length === 0) {
    // Fallback: Return recently created products if no order history
    const fallbackProducts = await prisma.product.findMany({
      where: {
        active: true,
        published: true,
        vendor: {
          status: "active",
        },
      },
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
        bookingUrl: true,
        vendor: {
          select: { bookingUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return fallbackProducts;
  }

  const productIds = ranked.map((item) => item.productId);

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      active: true,
      published: true,
      vendor: {
        status: "active",
      },
    },
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
      bookingUrl: true,
        vendor: {
          select: { bookingUrl: true },
        },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  // Return products in order of total quantity purchased
  return ranked
    .map((rankedItem) => productMap.get(rankedItem.productId))
    .filter(Boolean);
}
