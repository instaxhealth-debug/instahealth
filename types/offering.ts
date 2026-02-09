// Unified Offering type for products, services, and tests
// This allows vendors to offer any type of item using the same structure

export type OfferingType = "product" | "service" | "test";
export type OfferingCategory = "peptides" | "iv-drips" | "blood-tests";

export interface Offering {
  id: string;
  vendorId: string;
  type: OfferingType;
  name: string;
  shortDescription: string;
  price: number;
  currency: string;
  
  // Product-specific fields
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  inventoryQuantity?: number;
  
  // Service/Test-specific fields
  duration?: number; // in minutes
  deposit?: number;
  
  // Test-specific fields
  canBeAtHome?: boolean;
  
  // Common fields
  availabilityText?: string; // e.g., "Delivery today", "Next available: Tomorrow"
  image?: string;
  slug: string;
  calendlyUrl?: string;
  
  // Shopify integration (for products)
  shopifyProductId?: string;
  shopifyVariantId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
