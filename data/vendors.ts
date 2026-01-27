// Vendor Registry - Single source of truth for vendor → vertical mapping
// This file controls which vendors appear in which marketplace verticals

export type Vertical = "peptides" | "iv" | "bloods";

export type VendorConfig = {
  id: string;
  name: string;
  vertical: Vertical;
  shopifyVendorName: string; // Must match Shopify product vendor field exactly
  isActive: boolean;
  serviceAreas?: string[];
  availabilityText?: string;
  logoUrl?: string;
  rating?: number;
  reviewCount?: number;
  promo?: {
    text: string;
    type: "free_delivery" | "discount" | "first_order";
  };
  isVerified?: boolean;
};

export const VENDORS: VendorConfig[] = [
  {
    id: "instapepz",
    name: "InstaPepz",
    vertical: "peptides",
    shopifyVendorName: "InstaPepz",
    isActive: true,
    serviceAreas: ["Dubai", "Abu Dhabi", "Sharjah"],
    availabilityText: "Delivery today",
    rating: 4.9,
    reviewCount: 342,
    promo: {
      text: "Free delivery over $100",
      type: "free_delivery",
    },
    isVerified: true,
  },
  {
    id: "syncom",
    name: "Syncom",
    vertical: "peptides",
    shopifyVendorName: "Syncom",
    isActive: true,
    serviceAreas: ["Dubai", "Abu Dhabi", "Sharjah"],
    availabilityText: "Delivery today",
    rating: 4.8,
    reviewCount: 156,
    promo: {
      text: "Free delivery over $100",
      type: "free_delivery",
    },
    isVerified: true,
  },
];
