// Mock data for development - Replace with real API calls
import type { Product, IVService, BloodTest } from "@/types";

export const mockProducts: Product[] = [
  {
    id: "prod-1",
    type: "product",
    vertical: "pepz",
    name: "BPC-157 Peptide",
    slug: "bpc-157-peptide",
    description: "Recovery and healing support peptide",
    image: "",
    categoryId: "cat-recovery",
    shopifyProductId: "gid://shopify/Product/1",
    shopifyVariantId: "gid://shopify/ProductVariant/1",
    price: 89.99,
    currency: "USD",
    inventoryQuantity: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "prod-2",
    type: "product",
    vertical: "pepz",
    name: "Semaglutide",
    slug: "semaglutide",
    description: "Metabolic support peptide",
    image: "",
    categoryId: "cat-performance",
    shopifyProductId: "gid://shopify/Product/2",
    shopifyVariantId: "gid://shopify/ProductVariant/2",
    price: 149.99,
    currency: "USD",
    inventoryQuantity: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockIVServices: IVService[] = [
  {
    id: "iv-1",
    type: "service",
    vertical: "ivz",
    name: "Hydration Boost",
    slug: "hydration-boost",
    description: "Rapid rehydration with electrolytes and vitamins",
    image: "",
    categoryId: "cat-hydration",
    duration: 30,
    price: 149,
    currency: "USD",
    deposit: 50,
    benefits: ["Rapid hydration", "Electrolyte balance", "Energy boost"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "iv-2",
    type: "service",
    vertical: "ivz",
    name: "Energy & Performance",
    slug: "energy-performance",
    description: "B-vitamins, amino acids, and energy boosters",
    image: "",
    categoryId: "cat-energy",
    duration: 45,
    price: 199,
    currency: "USD",
    deposit: 75,
    benefits: ["Increased energy", "Mental clarity", "Performance support"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "iv-3",
    type: "service",
    vertical: "ivz",
    name: "Recovery Drip",
    slug: "recovery-drip",
    description: "Post-workout recovery with amino acids and antioxidants",
    image: "",
    categoryId: "cat-recovery",
    duration: 45,
    price: 179,
    currency: "USD",
    deposit: 60,
    benefits: ["Faster recovery", "Reduced inflammation", "Muscle repair"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockBloodTests: BloodTest[] = [
  {
    id: "test-1",
    type: "test",
    vertical: "bloodz",
    name: "General Health Panel",
    slug: "general-health-panel",
    description: "Comprehensive health screening including CBC, metabolic panel, and lipids",
    image: "",
    categoryId: "cat-general",
    price: 199,
    currency: "USD",
    duration: 15,
    markers: ["CBC", "Metabolic Panel", "Lipid Panel", "Liver Function"],
    canBeAtHome: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "test-2",
    type: "test",
    vertical: "bloodz",
    name: "Performance Panel",
    slug: "performance-panel",
    description: "Athlete-focused testing for performance optimization",
    image: "",
    categoryId: "cat-performance",
    price: 299,
    currency: "USD",
    duration: 15,
    markers: ["Testosterone", "Cortisol", "Vitamin D", "Iron Panel"],
    canBeAtHome: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "test-3",
    type: "test",
    vertical: "bloodz",
    name: "Hormone Panel",
    slug: "hormone-panel",
    description: "Complete hormone analysis for men and women",
    image: "",
    categoryId: "cat-hormones",
    price: 249,
    currency: "USD",
    duration: 15,
    markers: ["Testosterone", "Estrogen", "Progesterone", "Thyroid"],
    canBeAtHome: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Availability helpers
export function getNextDeliveryTime(): { available: boolean; message: string } {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour < 18) {
    return { available: true, message: "Delivery today" };
  }
  return { available: true, message: "Next-day delivery" };
}

export function getNextBookingSlot(): { available: boolean; message: string } {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour < 14) {
    return { available: true, message: "Today at 2:00 PM" };
  }
  return { available: true, message: "Tomorrow at 10:00 AM" };
}

export function getNextCollectionSlot(): { available: boolean; message: string } {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour < 12) {
    return { available: true, message: "Today at 12:00 PM" };
  }
  return { available: true, message: "Tomorrow at 10:00 AM" };
}
