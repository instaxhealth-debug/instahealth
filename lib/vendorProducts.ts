// Vendor product helpers - Shopify removed, TODO: Convert to Prisma

import { VENDORS, type Vertical, type VendorConfig } from "@/data/vendors";
type ShopifyProduct = any; // Stub type

export function getActiveVendorsByVertical(vertical: Vertical): VendorConfig[] {
  return VENDORS.filter((v) => v.isActive && v.vertical === vertical);
}

export function getVendorById(id: string): VendorConfig | undefined {
  return VENDORS.find((v) => v.id === id && v.isActive);
}

export async function getVendorCatalogPreview(
  vendor: VendorConfig,
  limit = 3
): Promise<{
  vendor: VendorConfig;
  products: ShopifyProduct[];
  total: number;
}> {
  // Shopify removed - TODO: Convert to Prisma
  return {
    vendor,
    products: [],
    total: 0,
  };
}

export async function getVendorFullCatalog(
  vendor: VendorConfig
): Promise<ShopifyProduct[]> {
  // Shopify removed - TODO: Convert to Prisma
  return [];
}
