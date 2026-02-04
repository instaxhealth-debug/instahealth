// Vendor/Provider data model for marketplace

export type VendorCategory = "peptides" | "iv-drips" | "blood-tests";

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: VendorCategory;
  
  // Service areas / delivery areas
  serviceAreas: string[]; // e.g., ["Dubai", "Abu Dhabi"]
  
  // Availability text
  availabilityText: string; // e.g., "Delivery today", "Next available: Tomorrow"
  
  // Optional metadata
  rating?: number;
  reviewCount?: number;
  logoUrl?: string; // Path to vendor logo image
  promo?: {
    text: string;
    type: "free_delivery" | "discount" | "first_order";
  };
  isVerified?: boolean;
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
