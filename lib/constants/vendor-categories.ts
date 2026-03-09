/**
 * Single source of truth for vendor categories
 * Used for validation, UI rendering, and type safety
 */

export const BUSINESS_CATEGORIES = [
  { slug: "blood-tests", label: "Blood testing packages", description: "Blood testing packages" },
  { slug: "iv-drips", label: "IV Drips", description: "IV therapy and wellness drips" },
  { slug: "clinics", label: "Clinics", description: "Medical clinics and healthcare facilities" },
  { slug: "peptides", label: "Peptides", description: "Peptide products from verified vendors" },
  { slug: "amino-acids", label: "Amino Acids", description: "Amino acid supplements and formulations" },
  { slug: "hormones", label: "Hormones", description: "Hormone optimization" },
  { slug: "consultations", label: "Consultations", description: "Consult with health pros" },
  { slug: "insurance", label: "Insurance", description: "Health insurance plans" },
  { slug: "supplements", label: "Supplements", description: "Vitamins and supplements" },
  { slug: "haircare", label: "Haircare", description: "Hair wellness products" },
  { slug: "pets", label: "Pets", description: "Pet health and wellness" },
] as const;

export const BUSINESS_CATEGORY_LABELS = [
  "Blood testing packages",
  "IV Drips",
  "Clinics",
  "Peptides",
  "Amino Acids",
  "Hormones",
  "Consultations",
  "Insurance",
  "Supplements",
  "Haircare",
  "Pets",
] as const;

// Type-safe category slugs
export type VendorCategorySlug = typeof BUSINESS_CATEGORIES[number]['slug'];
export type VendorCategoryLabel = typeof BUSINESS_CATEGORY_LABELS[number];

// Validation sets (O(1) lookup)
export const VALID_CATEGORY_SLUGS = new Set<string>(
  BUSINESS_CATEGORIES.map(c => c.slug)
);

export const VALID_CATEGORY_LABELS = new Set<string>(
  BUSINESS_CATEGORY_LABELS
);

/**
 * Server-side validation for category slugs
 */
export function isValidCategorySlug(slug: unknown): slug is VendorCategorySlug {
  return typeof slug === 'string' && VALID_CATEGORY_SLUGS.has(slug);
}

/**
 * Server-side validation for category labels (businessCategory field)
 */
export function isValidCategoryLabel(label: unknown): label is VendorCategoryLabel {
  return typeof label === 'string' && VALID_CATEGORY_LABELS.has(label);
}

/**
 * Validate array of category slugs (for selectedCategories field)
 */
export function validateCategorySlugs(slugs: unknown[]): slugs is VendorCategorySlug[] {
  if (!Array.isArray(slugs) || slugs.length === 0) return false;
  return slugs.every(isValidCategorySlug);
}
