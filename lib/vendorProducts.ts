// Vendor product helpers

import { VENDORS, type Vertical, type VendorConfig } from "@/data/vendors";

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
  products: any[];
  total: number;
}> {
  // Returns empty - use Prisma for actual product queries
  return {
    vendor,
    products: [],
    total: 0,
  };
}

export async function getVendorFullCatalog(
  vendor: VendorConfig
): Promise<any[]> {
  // Returns empty - use Prisma for actual product queries
  return [];
}
