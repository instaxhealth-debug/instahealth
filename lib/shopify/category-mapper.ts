/**
 * Shopify Category Mapper
 *
 * Maps Shopify product types, tags, and collections to InstaHealth categories
 */

import type { ShopifyProduct } from "./types";

export type InstahealthCategory =
  | "blood-tests"
  | "iv-drips"
  | "supplements"
  | "peptides"
  | "hormones"
  | "consultations"
  | "insurance"
  | "skincare"
  | "haircare"
  | "amino-acids";

interface CategoryMapping {
  keywords: string[];
  category: InstahealthCategory;
  priority: number; // Higher = checked first
}

const CATEGORY_MAPPINGS: CategoryMapping[] = [
  // IV Drips
  {
    keywords: ["iv", "drip", "infusion", "iv therapy", "intravenous"],
    category: "iv-drips",
    priority: 100,
  },
  // Blood Tests
  {
    keywords: ["blood test", "lab", "diagnostic", "bloodwork", "testing"],
    category: "blood-tests",
    priority: 90,
  },
  // Peptides
  {
    keywords: ["peptide", "bpc", "thymosin", "hexarelin", "ipamorelin", "cjc", "retatrutide"],
    category: "peptides",
    priority: 80,
  },
  // Hormones
  {
    keywords: ["hormone", "testosterone", "estrogen", "hrt", "trt", "growth hormone"],
    category: "hormones",
    priority: 75,
  },
  // Amino Acids
  {
    keywords: ["amino acid", "l-carnitine", "glutamine", "bcaa", "amino"],
    category: "amino-acids",
    priority: 70,
  },
  // Supplements
  {
    keywords: ["supplement", "vitamin", "mineral", "multivitamin", "protein", "probiotic"],
    category: "supplements",
    priority: 60,
  },
  // Skincare
  {
    keywords: ["skincare", "skin care", "serum", "moisturizer", "cleanser", "anti-aging"],
    category: "skincare",
    priority: 50,
  },
  // Haircare
  {
    keywords: ["haircare", "hair care", "shampoo", "conditioner", "hair growth"],
    category: "haircare",
    priority: 50,
  },
  // Consultations
  {
    keywords: ["consultation", "consult", "appointment", "visit", "session"],
    category: "consultations",
    priority: 40,
  },
  // Insurance
  {
    keywords: ["insurance", "coverage", "policy"],
    category: "insurance",
    priority: 30,
  },
];

/**
 * Map Shopify product to InstaHealth category
 */
export function mapShopifyToCategory(
  product: ShopifyProduct,
  manualOverride?: InstahealthCategory
): InstahealthCategory {
  // Manual override takes precedence
  if (manualOverride) {
    return manualOverride;
  }

  // Prepare searchable text
  const searchText = [
    product.title,
    product.product_type,
    product.tags,
    product.body_html || "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Find best match by priority
  for (const mapping of CATEGORY_MAPPINGS.sort((a, b) => b.priority - a.priority)) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return mapping.category;
      }
    }
  }

  // Default fallback
  return "supplements";
}

/**
 * Validate category against vendor's allowed categories
 */
export function isValidCategoryForVendor(
  category: InstahealthCategory,
  allowedCategories: string[]
): boolean {
  // If vendor has no restrictions, allow all
  if (!allowedCategories || allowedCategories.length === 0) {
    return true;
  }

  return allowedCategories.includes(category);
}

/**
 * Get category suggestions for a product
 */
export function getCategorySuggestions(product: ShopifyProduct): InstahealthCategory[] {
  const searchText = [
    product.title,
    product.product_type,
    product.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const suggestions: Array<{ category: InstahealthCategory; score: number }> = [];

  for (const mapping of CATEGORY_MAPPINGS) {
    let score = 0;
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += mapping.priority;
      }
    }
    if (score > 0) {
      suggestions.push({ category: mapping.category, score });
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.category);
}
