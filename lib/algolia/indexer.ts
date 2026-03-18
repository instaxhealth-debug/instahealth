/**
 * Algolia Indexer - Core Logic
 *
 * Plain utility for indexing products to Algolia.
 * Can be used by both Next.js server code and standalone scripts.
 *
 * NO "server-only" import here - this is a shared utility.
 */

import algoliasearch from "algoliasearch";
import type { PrismaClient } from "@prisma/client";

export type ProductSearchObject = {
  objectID: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  vendorId: string;
  vendorName: string;
  active: boolean;
  published: boolean;
  locationIds: string[];
  citySlugs: string[];
  countryCode?: string;
  price: number;
  currency: string;
  marginPct?: number;
  inventoryStatus: "in_stock" | "low" | "out";
  vendorVerified: boolean;
  vendorRatingAvg?: number;
  vendorRatingCount?: number;
  productRatingAvg?: number;
  productRatingCount?: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  vendorVerifiedScore: number;
  inventoryScore: number;
  vendorRatingWeighted?: number;
  productRatingWeighted?: number;
};

function inventoryScoreFromStatus(status: "in_stock" | "low" | "out"): number {
  if (status === "in_stock") return 2;
  if (status === "low") return 1;
  return 0;
}

function weightedRating(avg: number | null | undefined, count: number | null | undefined): number {
  if (!avg || !count || count < 3) return 0;
  return avg * Math.log1p(count);
}

async function buildProductSearchObject(
  product: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category: string;
    priceFils: number;
    active: boolean;
    published: boolean;
    inventoryStatus: string;
    isGlobal: boolean;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    vendorId: string;
    vendor: {
      name: string;
      verified: boolean;
      country: string | null;
      rating: number | null;
      ratingCount: number | null;
    };
    locations: Array<{
      locationId: string;
      location: {
        slug: string;
      };
    }>;
  },
  activeLocations: Array<{ id: string; slug: string }>
): Promise<ProductSearchObject> {
  const vendorVerified = Boolean(product.vendor?.verified);
  const inventoryStatus = (product.inventoryStatus || "in_stock") as "in_stock" | "low" | "out";
  const inventoryScore = inventoryScoreFromStatus(inventoryStatus);

  const locationIds = product.isGlobal
    ? activeLocations.map((l) => l.id)
    : product.locations.map((pl) => pl.locationId);
  const citySlugs = product.isGlobal
    ? activeLocations.map((l) => l.slug)
    : product.locations.map((pl) => pl.location.slug);

  const vendorRatingAvg = product.vendor?.rating ?? undefined;
  const vendorRatingCount = product.vendor?.ratingCount ?? undefined;

  const vendorRatingWeighted = weightedRating(vendorRatingAvg, vendorRatingCount) || undefined;

  const price = product.priceFils / 100;

  return {
    objectID: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description || undefined,
    category: product.category,
    vendorId: product.vendorId,
    vendorName: product.vendor?.name || "",
    active: product.active,
    published: product.published,
    locationIds,
    citySlugs,
    countryCode: product.vendor?.country || undefined,
    price,
    currency: "AED",
    marginPct: undefined,
    inventoryStatus,
    vendorVerified,
    vendorRatingAvg,
    vendorRatingCount,
    productRatingAvg: undefined,
    productRatingCount: undefined,
    tags: product.tags || [],
    createdAt: product.createdAt.getTime(),
    updatedAt: product.updatedAt.getTime(),
    vendorVerifiedScore: vendorVerified ? 1 : 0,
    inventoryScore,
    vendorRatingWeighted,
    productRatingWeighted: undefined,
  };
}

export interface AlgoliaConfig {
  appId: string;
  adminKey: string;
  indexName: string;
}

export class AlgoliaIndexer {
  private client: ReturnType<typeof algoliasearch>;
  private index: ReturnType<ReturnType<typeof algoliasearch>["initIndex"]>;
  private prisma: PrismaClient;

  constructor(config: AlgoliaConfig, prisma: PrismaClient) {
    this.client = algoliasearch(config.appId, config.adminKey);
    this.index = this.client.initIndex(config.indexName);
    this.prisma = prisma;
  }

  async upsertProduct(productId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        active: true,
        published: true,
        vendor: {
          status: "active",
        },
      },
      include: {
        vendor: {
          select: {
            name: true,
            verified: true,
            country: true,
            rating: true,
            ratingCount: true,
          },
        },
        locations: {
          include: { location: true },
        },
      },
    });

    if (!product) {
      // If product doesn't meet criteria, remove it from index
      await this.index.deleteObject(productId).catch(() => {
        // Ignore errors if object doesn't exist
      });
      return;
    }

    const activeLocations = await this.prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    });

    const obj = await buildProductSearchObject(product as any, activeLocations);
    await this.index.saveObject(obj);
  }

  async removeProduct(productId: string): Promise<void> {
    await this.index.deleteObject(productId);
  }

  async reindexAll(): Promise<{ count: number; duration: number }> {
    const startTime = Date.now();
    const activeLocations = await this.prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    });

    const totalCount = await this.prisma.product.count({
      where: {
        active: true,
        published: true,
        vendor: {
          status: "active",
        },
      },
    });
    const pageSize = 100;
    const batchSize = 300; // Objects per saveObjects call
    let totalProcessed = 0;

    for (let offset = 0; offset < totalCount; offset += pageSize) {
      const products = await this.prisma.product.findMany({
        skip: offset,
        take: pageSize,
        where: {
          active: true,
          published: true,
          vendor: {
            status: "active",
          },
        },
        include: {
          vendor: {
            select: {
              name: true,
              verified: true,
              country: true,
              rating: true,
              ratingCount: true,
            },
          },
          locations: {
            include: { location: true },
          },
        },
      });

      const searchObjects: ProductSearchObject[] = [];
      for (const product of products) {
        const obj = await buildProductSearchObject(product as any, activeLocations);
        searchObjects.push(obj);
      }

      // Save in batches
      for (let i = 0; i < searchObjects.length; i += batchSize) {
        const batch = searchObjects.slice(i, i + batchSize);
        await this.index.saveObjects(batch);
        totalProcessed += batch.length;
      }
    }

    const duration = Date.now() - startTime;
    return { count: totalProcessed, duration };
  }

  async reindexByIds(productIds: string[]): Promise<void> {
    const activeLocations = await this.prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    });

    const batchSize = 300;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const chunk = productIds.slice(i, i + batchSize);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: chunk },
          active: true,
          published: true,
          vendor: {
            status: "active",
          },
        },
        include: {
          vendor: {
            select: {
              name: true,
              verified: true,
              country: true,
              rating: true,
              ratingCount: true,
            },
          },
          locations: {
            include: { location: true },
          },
        },
      });

      const searchObjects: ProductSearchObject[] = [];
      for (const product of products) {
        const obj = await buildProductSearchObject(product as any, activeLocations);
        searchObjects.push(obj);
      }

      if (searchObjects.length > 0) {
        await this.index.saveObjects(searchObjects);
      }
    }
  }

  async clearIndex(): Promise<void> {
    await this.index.clearObjects();
  }

  async getSettings(): Promise<any> {
    return await this.index.getSettings();
  }
}
