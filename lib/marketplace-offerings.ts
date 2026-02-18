import { isServiceCategory, normalizeCategory } from "@/lib/vendor-categories";
import type { Offering } from "@/types/offering";

export interface MarketplaceProduct {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  priceFils: number;
  imageUrl: string | null;
  inStock: boolean;
  inventoryStatus?: string | null;
  bookingUrl: string | null;
  vendor: {
    bookingUrl: string | null;
  };
}

export function prismaProductToOffering(product: MarketplaceProduct): Offering {
  const normalizedCategory = normalizeCategory(product.category);
  const isService = isServiceCategory(normalizedCategory);
  const isTest = normalizedCategory === "blood-tests";
  const type: Offering["type"] = isTest ? "test" : isService ? "service" : "product";

  const inventoryStatus = product.inventoryStatus || (product.inStock ? "in_stock" : "out");
  const stockStatus =
    type === "product"
      ? inventoryStatus === "low"
        ? "low_stock"
        : inventoryStatus === "out"
        ? "out_of_stock"
        : "in_stock"
      : undefined;

  return {
    id: product.id,
    vendorId: product.vendorId,
    type,
    name: product.name,
    shortDescription: product.description || "",
    price: product.priceFils / 100,
    currency: "AED",
    stockStatus,
    image: product.imageUrl || undefined,
    slug: product.slug,
    bookingUrl: product.bookingUrl || product.vendor.bookingUrl || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
