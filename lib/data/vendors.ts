// Vendor and offerings data
import type { Vendor, VendorCategory } from "@/types/vendor";
import type { Offering } from "@/types/offering";
import { mockProducts, mockIVServices, mockBloodTests } from "./mock-data";

// VENDORS
export const vendors: Vendor[] = [
  {
    id: "vendor-instapepz",
    name: "InstaPepz",
    slug: "instapepz",
    description: "Premium peptide products delivered fast",
    category: "peptides",
    serviceAreas: ["Dubai", "Abu Dhabi", "Sharjah"],
    availabilityText: "Delivery today",
    rating: 4.9,
    reviewCount: 342,
    logoUrl: "/vendors/bloodtestvendors/bloodz.png",
    promo: {
      text: "Free delivery over $100",
      type: "free_delivery",
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "vendor-peptide-labs",
    name: "Peptide Labs",
    slug: "peptide-labs",
    description: "Premium peptide supplier",
    category: "peptides",
    serviceAreas: ["Dubai", "Abu Dhabi"],
    availabilityText: "Delivery today",
    rating: 4.8,
    reviewCount: 124,
    logoUrl: "/vendors/bloodtestvendors/firstresponse-healthcare.png",
    promo: {
      text: "Free delivery over $100",
      type: "free_delivery",
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "vendor-biohealth",
    name: "BioHealth Supply",
    slug: "biohealth-supply",
    description: "Trusted health products",
    category: "peptides",
    serviceAreas: ["Dubai"],
    availabilityText: "Next-day delivery",
    rating: 4.6,
    reviewCount: 89,
    logoUrl: "/vendors/bloodtestvendors/mydoctor-healthcare.png",
    promo: {
      text: "First order 15% off",
      type: "first_order",
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "vendor-mobile-iv",
    name: "Mobile IV Care",
    slug: "mobile-iv-care",
    description: "Professional IV therapy at your location",
    category: "iv-drips",
    serviceAreas: ["Dubai", "Abu Dhabi", "Sharjah"],
    availabilityText: "Nurse available today",
    rating: 4.9,
    reviewCount: 203,
    logoUrl: "/vendors/bloodtestvendors/bloodz.png",
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "vendor-wellness-drip",
    name: "Wellness Drip Co",
    slug: "wellness-drip-co",
    description: "Premium IV services",
    category: "iv-drips",
    serviceAreas: ["Dubai"],
    availabilityText: "Limited slots today",
    rating: 4.7,
    reviewCount: 156,
    logoUrl: "/vendors/bloodtestvendors/firstresponse-healthcare.png",
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "vendor-health-diagnostics",
    name: "Health Diagnostics Lab",
    slug: "health-diagnostics-lab",
    description: "Comprehensive blood testing",
    category: "blood-tests",
    serviceAreas: ["Dubai", "Abu Dhabi"],
    availabilityText: "Collection available today",
    rating: 4.8,
    reviewCount: 312,
    logoUrl: "/vendors/bloodtestvendors/healthchecks360.png",
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "vendor-quicktest",
    name: "QuickTest Labs",
    slug: "quicktest-labs",
    description: "Fast turnaround testing",
    category: "blood-tests",
    serviceAreas: ["Dubai"],
    availabilityText: "Results in 24-48 hrs",
    rating: 4.5,
    reviewCount: 98,
    logoUrl: "/vendors/bloodtestvendors/healthone-healthcare.png",
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// OFFERINGS - Unified structure for products, services, and tests
export const offerings: Offering[] = [
  // InstaPepz products (from Shopify)
  ...mockProducts.slice(0, 5).map((product, idx) => ({
    id: `offering-instapepz-${product.id}`,
    vendorId: "vendor-instapepz",
    type: "product" as const,
    name: product.name,
    shortDescription: product.description || "",
    price: product.price,
    currency: product.currency,
    stockStatus: product.inventoryQuantity
      ? product.inventoryQuantity > 10
        ? ("in_stock" as const)
        : ("low_stock" as const)
      : ("in_stock" as const),
    inventoryQuantity: product.inventoryQuantity,
    availabilityText: "Delivery today",
    image: product.image,
    slug: product.slug,
    shopifyProductId: product.shopifyProductId,
    shopifyVariantId: product.shopifyVariantId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  
  // Peptide Labs products
  ...mockProducts.slice(2, 4).map((product) => ({
    id: `offering-peptide-labs-${product.id}`,
    vendorId: "vendor-peptide-labs",
    type: "product" as const,
    name: product.name,
    shortDescription: product.description || "",
    price: product.price,
    currency: product.currency,
    stockStatus: "in_stock" as const,
    availabilityText: "Delivery today",
    image: product.image,
    slug: product.slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  
  // BioHealth products
  ...mockProducts.slice(4, 6).map((product) => ({
    id: `offering-biohealth-${product.id}`,
    vendorId: "vendor-biohealth",
    type: "product" as const,
    name: product.name,
    shortDescription: product.description || "",
    price: product.price,
    currency: product.currency,
    stockStatus: "in_stock" as const,
    availabilityText: "Next-day delivery",
    image: product.image,
    slug: product.slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  
  // Mobile IV Care services
  ...mockIVServices.slice(0, 3).map((service) => ({
    id: `offering-mobile-iv-${service.id}`,
    vendorId: "vendor-mobile-iv",
    type: "service" as const,
    name: service.name,
    shortDescription: service.description || "",
    price: service.price,
    currency: service.currency,
    duration: service.duration,
    deposit: service.deposit,
    availabilityText: "Next available: Today",
    image: service.image,
    slug: service.slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  
  // Wellness Drip services
  ...mockIVServices.slice(2, 4).map((service) => ({
    id: `offering-wellness-drip-${service.id}`,
    vendorId: "vendor-wellness-drip",
    type: "service" as const,
    name: service.name,
    shortDescription: service.description || "",
    price: service.price,
    currency: service.currency,
    duration: service.duration,
    deposit: service.deposit,
    availabilityText: "Limited slots today",
    image: service.image,
    slug: service.slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  
  // Health Diagnostics tests
  ...mockBloodTests.slice(0, 3).map((test) => ({
    id: `offering-health-diagnostics-${test.id}`,
    vendorId: "vendor-health-diagnostics",
    type: "test" as const,
    name: test.name,
    shortDescription: test.description || "",
    price: test.price,
    currency: test.currency,
    duration: test.duration,
    canBeAtHome: test.canBeAtHome,
    availabilityText: "Collection available today",
    image: test.image,
    slug: test.slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  
  // QuickTest tests
  ...mockBloodTests.slice(2, 4).map((test) => ({
    id: `offering-quicktest-${test.id}`,
    vendorId: "vendor-quicktest",
    type: "test" as const,
    name: test.name,
    shortDescription: test.description || "",
    price: test.price,
    currency: test.currency,
    duration: test.duration,
    canBeAtHome: test.canBeAtHome,
    availabilityText: "Results in 24-48 hrs",
    image: test.image,
    slug: test.slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
];

// Helper functions
export function getVendorsByCategory(category: VendorCategory): Vendor[] {
  return vendors.filter((v) => v.category === category && v.isActive);
}

export function getOfferingsByVendor(vendorId: string): Offering[] {
  return offerings.filter((o) => o.vendorId === vendorId);
}

export function getVendorById(vendorId: string): Vendor | undefined {
  return vendors.find((v) => v.id === vendorId);
}

export function getVendorBySlug(slug: string): Vendor | undefined {
  return vendors.find((v) => v.slug === slug);
}
