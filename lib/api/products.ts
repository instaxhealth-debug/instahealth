import { prisma } from "@/lib/prisma";
import { formatPriceAED } from "@/lib/utils/price";

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

// Fetch all active products from Prisma
export async function getProductsFromPrisma(): Promise<StorefrontProduct[]> {
  const prismaProducts = await prisma.product.findMany({
    where: {
      active: true,
      inStock: true,
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
}

// Fetch products by category
export async function getProductsByCategoryFromPrisma(
  category: string
): Promise<StorefrontProduct[]> {
  const prismaProducts = await prisma.product.findMany({
    where: {
      active: true,
      inStock: true,
      category: category,
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
}

// Fetch products by vendor ID
export async function getProductsByVendorIdFromPrisma(
  vendorId: string
): Promise<StorefrontProduct[]> {
  const prismaProducts = await prisma.product.findMany({
    where: {
      active: true,
      inStock: true,
      vendorId: vendorId,
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
}

// Fetch a single product by slug
export async function getProductBySlugFromPrisma(
  slug: string
): Promise<StorefrontProduct | null> {
  const prismaProduct = await prisma.product.findUnique({
    where: {
      slug: slug,
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

  if (!prismaProduct || !prismaProduct.active || !prismaProduct.inStock) {
    return null;
  }

  return prismaProductToStorefrontProduct(prismaProduct);
}

// Fetch a single product by ID
export async function getProductByIdFromPrisma(
  id: string
): Promise<StorefrontProduct | null> {
  const prismaProduct = await prisma.product.findUnique({
    where: {
      id: id,
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

  if (!prismaProduct || !prismaProduct.active || !prismaProduct.inStock) {
    return null;
  }

  return prismaProductToStorefrontProduct(prismaProduct);
}
