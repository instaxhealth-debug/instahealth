import { prisma } from "@/lib/prisma";
import { formatPriceAED } from "@/lib/utils/price";

// Query options for product helpers
export type ProductQueryOptions = {
  includeInactive?: boolean;
};

// Product type for storefront (without Shopify placeholders)
export interface StorefrontProduct {
  id: string;
  type: "product";
  vertical: "pepz";
  name: string;
  slug: string;
  description: string;
  image: string;
  categoryId: string;
  price: number; // Price in AED (decimal)
  priceFils: number; // Price in fils (integer)
  priceDisplay: string; // Formatted as "AED X.XX"
  currency: "AED";
  inventoryQuantity?: number;
  isActive: boolean;
  vendorId: string;
  vendorName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transform Prisma Product to StorefrontProduct type
function prismaProductToStorefrontProduct(prismaProduct: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  priceFils: number;
  imageUrl: string | null;
  vendor: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}): StorefrontProduct {
  const priceAED = prismaProduct.priceFils / 100;
  return {
    id: prismaProduct.id,
    type: "product",
    vertical: "pepz",
    name: prismaProduct.name,
    slug: prismaProduct.slug,
    description: prismaProduct.description || "",
    image: prismaProduct.imageUrl || "",
    categoryId: prismaProduct.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    price: priceAED,
    priceFils: prismaProduct.priceFils,
    priceDisplay: formatPriceAED(prismaProduct.priceFils),
    currency: "AED",
    isActive: true,
    vendorId: prismaProduct.vendor.id,
    vendorName: prismaProduct.vendor.name,
    createdAt: prismaProduct.createdAt,
    updatedAt: prismaProduct.updatedAt,
  };
}

// Fetch all active products from Prisma (PUBLIC: only active vendors)
export async function getProductsFromPrisma(
  options: ProductQueryOptions = {}
): Promise<StorefrontProduct[]> {
  const { includeInactive = false } = options;
  const vendorWhere = includeInactive ? {} : { vendor: { status: "active" } };

  try {
    const prismaProducts = await prisma.product.findMany({
      where: {
        active: true,
        inStock: true,
        ...vendorWhere,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return prismaProducts.map(prismaProductToStorefrontProduct);
  } catch (error) {
    console.error("[getProductsFromPrisma] Database error:", error);
    return [];
  }
}

// Fetch products by category (PUBLIC: only active vendors)
export async function getProductsByCategoryFromPrisma(
  category: string,
  options: ProductQueryOptions = {}
): Promise<StorefrontProduct[]> {
  const { includeInactive = false } = options;
  const vendorWhere = includeInactive ? {} : { vendor: { status: "active" } };

  try {
    const prismaProducts = await prisma.product.findMany({
      where: {
        active: true,
        inStock: true,
        category: category,
        ...vendorWhere,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return prismaProducts.map(prismaProductToStorefrontProduct);
  } catch (error) {
    console.error(
      "[getProductsByCategoryFromPrisma] Database error for category:",
      category,
      error
    );
    return [];
  }
}

// Fetch products by vendor ID (PUBLIC: only active vendors)
export async function getProductsByVendorIdFromPrisma(
  vendorId: string,
  options: ProductQueryOptions = {}
): Promise<StorefrontProduct[]> {
  const { includeInactive = false } = options;
  const vendorWhere = includeInactive ? {} : { vendor: { status: "active" } };

  try {
    const prismaProducts = await prisma.product.findMany({
      where: {
        active: true,
        inStock: true,
        vendorId: vendorId,
        ...vendorWhere,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return prismaProducts.map(prismaProductToStorefrontProduct);
  } catch (error) {
    console.error(
      "[getProductsByVendorIdFromPrisma] Database error for vendor:",
      vendorId,
      error
    );
    return [];
  }
}

// Fetch a single product by slug (PUBLIC: only active vendors)
export async function getProductBySlugFromPrisma(
  slug: string,
  options: ProductQueryOptions = {}
): Promise<StorefrontProduct | null> {
  const { includeInactive = false } = options;
  const vendorWhere = includeInactive ? {} : { vendor: { status: "active" } };

  try {
    const prismaProduct = await prisma.product.findFirst({
      where: {
        slug: slug,
        active: true,
        inStock: true,
        ...vendorWhere,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!prismaProduct) {
      return null;
    }

    return prismaProductToStorefrontProduct(prismaProduct);
  } catch (error) {
    console.error("[getProductBySlugFromPrisma] Database error for slug:", slug, error);
    return null;
  }
}

// Fetch a single product by ID (PUBLIC: only active vendors)
export async function getProductByIdFromPrisma(
  id: string,
  options: ProductQueryOptions = {}
): Promise<StorefrontProduct | null> {
  const { includeInactive = false } = options;
  const vendorWhere = includeInactive ? {} : { vendor: { status: "active" } };

  try {
    const prismaProduct = await prisma.product.findFirst({
      where: {
        id: id,
        active: true,
        inStock: true,
        ...vendorWhere,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!prismaProduct) {
      return null;
    }

    return prismaProductToStorefrontProduct(prismaProduct);
  } catch (error) {
    console.error("[getProductByIdFromPrisma] Database error for id:", id, error);
    return null;
  }
}
