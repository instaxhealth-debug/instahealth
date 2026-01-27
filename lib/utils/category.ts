// Canonical category slugs - these are the ONLY values stored in DB
export const CATEGORY_SLUGS = {
  BLOOD_TESTS: "blood-tests",
  IV_DRIPS: "iv-drips",
  SUPPLEMENTS: "supplements",
  PEPTIDES: "peptides",
  HORMONES: "hormones",
  CONSULTATIONS: "consultations",
  INSURANCE: "insurance",
  SKINCARE: "skincare",
  HAIRCARE: "haircare",
} as const;

export type CategorySlug = typeof CATEGORY_SLUGS[keyof typeof CATEGORY_SLUGS];

// Display names for UI (derived from slug)
export const CATEGORY_DISPLAY_NAMES: Record<CategorySlug, string> = {
  [CATEGORY_SLUGS.BLOOD_TESTS]: "Blood Tests",
  [CATEGORY_SLUGS.IV_DRIPS]: "IV Drips",
  [CATEGORY_SLUGS.SUPPLEMENTS]: "Supplements",
  [CATEGORY_SLUGS.PEPTIDES]: "Peptides",
  [CATEGORY_SLUGS.HORMONES]: "Hormones",
  [CATEGORY_SLUGS.CONSULTATIONS]: "Consultations",
  [CATEGORY_SLUGS.INSURANCE]: "Insurance",
  [CATEGORY_SLUGS.SKINCARE]: "Skincare",
  [CATEGORY_SLUGS.HAIRCARE]: "Haircare",
};

// Normalize any category input to canonical slug
export function normalizeCategory(input: string): CategorySlug {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Map common variations to canonical slugs
  const mapping: Record<string, CategorySlug> = {
    "blood-tests": CATEGORY_SLUGS.BLOOD_TESTS,
    "blood-test": CATEGORY_SLUGS.BLOOD_TESTS,
    "blood tests": CATEGORY_SLUGS.BLOOD_TESTS,
    "blood test": CATEGORY_SLUGS.BLOOD_TESTS,
    "iv-drips": CATEGORY_SLUGS.IV_DRIPS,
    "iv-drip": CATEGORY_SLUGS.IV_DRIPS,
    "iv drips": CATEGORY_SLUGS.IV_DRIPS,
    "iv drip": CATEGORY_SLUGS.IV_DRIPS,
    supplements: CATEGORY_SLUGS.SUPPLEMENTS,
    supplement: CATEGORY_SLUGS.SUPPLEMENTS,
    peptides: CATEGORY_SLUGS.PEPTIDES,
    peptide: CATEGORY_SLUGS.PEPTIDES,
    hormones: CATEGORY_SLUGS.HORMONES,
    hormone: CATEGORY_SLUGS.HORMONES,
    consultations: CATEGORY_SLUGS.CONSULTATIONS,
    consultation: CATEGORY_SLUGS.CONSULTATIONS,
    insurance: CATEGORY_SLUGS.INSURANCE,
    skincare: CATEGORY_SLUGS.SKINCARE,
    "skin care": CATEGORY_SLUGS.SKINCARE,
    haircare: CATEGORY_SLUGS.HAIRCARE,
    "hair care": CATEGORY_SLUGS.HAIRCARE,
  };

  return mapping[normalized] || CATEGORY_SLUGS.BLOOD_TESTS; // Default fallback
}

// Validate category slug is canonical
export function isValidCategorySlug(slug: string): slug is CategorySlug {
  return Object.values(CATEGORY_SLUGS).includes(slug as CategorySlug);
}
