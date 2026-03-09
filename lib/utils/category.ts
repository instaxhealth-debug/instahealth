// Canonical category slugs - these are the ONLY values stored in DB
export const CATEGORY_SLUGS = {
  BLOOD_TESTS: "blood-tests",
  IV_DRIPS: "iv-drips",
  SUPPLEMENTS: "supplements",
  PEPTIDES: "peptides",
  AMINO_ACIDS: "amino-acids",
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
  [CATEGORY_SLUGS.AMINO_ACIDS]: "Amino Acids",
  [CATEGORY_SLUGS.HORMONES]: "Hormones",
  [CATEGORY_SLUGS.CONSULTATIONS]: "Consultations",
  [CATEGORY_SLUGS.INSURANCE]: "Insurance",
  [CATEGORY_SLUGS.SKINCARE]: "Skincare",
  [CATEGORY_SLUGS.HAIRCARE]: "Haircare",
};

// Canonical category registry with aliases vendors might use in CSV files
const CATEGORY_ALIASES: Record<CategorySlug, string[]> = {
  [CATEGORY_SLUGS.PEPTIDES]: [
    "peptide", "injectable peptides", "peptides injectable", "injections",
    "research peptides", "peptide therapy", "peptide shots", "peptide injections",
    "oral peptides", "peptides oral", "capsule peptides", "peptide capsules",
    "peptides capsules", "capsules", "caps", "oral capsules", "capsule",
    "nasal peptides", "peptide nasal", "nasal spray", "peptide nasal spray",
    "nasal",
  ],
  [CATEGORY_SLUGS.AMINO_ACIDS]: [
    "amino acid", "amino acids", "aminoacids", "amino", "aminos",
    "essential amino acids", "eaa", "bcaa", "branched chain amino acids",
  ],
  [CATEGORY_SLUGS.BLOOD_TESTS]: [
    "blood test", "lab tests", "lab test", "pathology", "labs",
    "blood work", "bloodwork", "laboratory tests", "diagnostics",
  ],
  [CATEGORY_SLUGS.IV_DRIPS]: [
    "iv drip", "iv therapy", "iv treatments", "iv infusion", "iv infusions",
    "drip therapy", "vitamin drip", "vitamin drips",
  ],
  [CATEGORY_SLUGS.SUPPLEMENTS]: [
    "supplement", "vitamins", "vitamin", "nutraceuticals", "nutritional supplements",
  ],
  [CATEGORY_SLUGS.HORMONES]: [
    "hormone", "hormone therapy", "hrt", "hormone replacement",
    "hormone treatment", "trt", "testosterone",
  ],
  [CATEGORY_SLUGS.CONSULTATIONS]: [
    "consultation", "doctor consultation", "medical consultation",
    "telehealth", "telemedicine", "virtual consultation", "appointments",
  ],
  [CATEGORY_SLUGS.INSURANCE]: [
    "health insurance", "medical insurance", "coverage", "insurance plans",
  ],
  [CATEGORY_SLUGS.SKINCARE]: [
    "skin care", "skin", "dermatology", "skin treatment", "skin treatments",
    "facial", "facials",
  ],
  [CATEGORY_SLUGS.HAIRCARE]: [
    "hair care", "hair", "hair treatment", "hair treatments",
    "hair loss", "hair restoration",
  ],
};

// Build a lookup map from all aliases (normalized) → slug
const ALIAS_LOOKUP: Map<string, CategorySlug> = new Map();
for (const [slug, aliases] of Object.entries(CATEGORY_ALIASES)) {
  // Add the slug itself and its display name
  ALIAS_LOOKUP.set(slug, slug as CategorySlug);
  const displayName = CATEGORY_DISPLAY_NAMES[slug as CategorySlug];
  if (displayName) {
    ALIAS_LOOKUP.set(normalizeCategoryInput(displayName), slug as CategorySlug);
  }
  for (const alias of aliases) {
    ALIAS_LOOKUP.set(normalizeCategoryInput(alias), slug as CategorySlug);
  }
}

/** Normalize raw input: trim, lowercase, collapse whitespace, strip punctuation */
export function normalizeCategoryInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[_\-\/—,()\[\]]+/g, " ") // Replace separators and parentheses with space
    .replace(/[^a-z0-9 ]/g, "") // Strip remaining punctuation
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

export type MappingReason = "SLUG" | "ALIAS" | "TOKEN_MATCH" | "BULK_ASSIGNED" | "BULK_ASSIGNED_AUTO_SINGLE" | "MISSING";
export type MappingConfidence = "HIGH" | "MEDIUM" | "LOW";

export type CategoryMapResult =
  | { slug: CategorySlug; matched: true; reason: MappingReason; confidence: MappingConfidence }
  | { slug: null; matched: false; error: string; ambiguousSlugs?: CategorySlug[] };

// Build token sets for each category (for safe token matching)
const CATEGORY_TOKEN_SETS: Map<CategorySlug, Set<string>> = new Map();
for (const [slug, aliases] of Object.entries(CATEGORY_ALIASES)) {
  const tokenSet = new Set<string>();
  // Add slug tokens (e.g., "blood-tests" → ["blood", "tests"])
  for (const t of normalizeCategoryInput(slug).split(" ")) tokenSet.add(t);
  // Add display name tokens
  const displayName = CATEGORY_DISPLAY_NAMES[slug as CategorySlug];
  if (displayName) {
    for (const t of normalizeCategoryInput(displayName).split(" ")) tokenSet.add(t);
  }
  // Add alias tokens
  for (const alias of aliases) {
    for (const t of normalizeCategoryInput(alias).split(" ")) tokenSet.add(t);
  }
  CATEGORY_TOKEN_SETS.set(slug as CategorySlug, tokenSet);
}

/**
 * Map a raw category string (from CSV or user input) to a canonical slug.
 * Priority: (1) direct slug match, (2) exact alias match, (3) safe token match.
 * Token match requires >=2 matching tokens AND unambiguous (only 1 category qualifies).
 */
export function mapCategoryToSlug(input: string): CategoryMapResult {
  if (!input || !input.trim()) {
    return { slug: null, matched: false, error: "Category is empty" };
  }

  const normalized = normalizeCategoryInput(input);

  // 1. Direct slug match (e.g., "peptides", "blood-tests")
  const asSlug = input.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (isValidCategorySlug(asSlug)) {
    return { slug: asSlug, matched: true, reason: "SLUG", confidence: "HIGH" };
  }

  // 2. Alias lookup (exact normalized match)
  const aliasMatch = ALIAS_LOOKUP.get(normalized);
  if (aliasMatch) {
    return { slug: aliasMatch, matched: true, reason: "ALIAS", confidence: "HIGH" };
  }

  // 3. Safe token-based match: requires >=2 token overlap AND unambiguous
  const inputTokens = normalized.split(" ").filter((t) => t.length > 1); // skip single-char tokens
  if (inputTokens.length >= 2) {
    const candidates: { slug: CategorySlug; matchCount: number }[] = [];
    for (const [slug, tokenSet] of CATEGORY_TOKEN_SETS.entries()) {
      const matchCount = inputTokens.filter((t) => tokenSet.has(t)).length;
      if (matchCount >= 2) {
        candidates.push({ slug, matchCount });
      }
    }

    if (candidates.length === 1) {
      return { slug: candidates[0].slug, matched: true, reason: "TOKEN_MATCH", confidence: "MEDIUM" };
    }
    if (candidates.length > 1) {
      // Ambiguous — multiple categories matched
      return {
        slug: null,
        matched: false,
        error: `Ambiguous category '${input.trim()}'`,
        ambiguousSlugs: candidates.map((c) => c.slug),
      };
    }
  }

  return {
    slug: null,
    matched: false,
    error: `Unknown category '${input.trim()}'`,
  };
}

/** Format allowed categories as "slug (Label)" for error messages */
export function formatAllowedCategories(slugs: string[]): string {
  return slugs
    .map((s) => `${s} (${CATEGORY_DISPLAY_NAMES[s as CategorySlug] || s})`)
    .join(", ");
}

// Normalize any category input to canonical slug (legacy compat — prefers mapCategoryToSlug)
export function normalizeCategory(input: string): CategorySlug {
  const result = mapCategoryToSlug(input);
  if (result.matched) return result.slug;

  // Fallback: slugify and try direct match
  const slugified = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (isValidCategorySlug(slugified)) return slugified;

  return CATEGORY_SLUGS.BLOOD_TESTS; // Default fallback
}

// Extract peptide subtype from raw category string
export type PeptideSubtype = "injectable" | "oral" | "nasal" | null;

export function extractPeptideSubtype(rawCategory: string, mappedSlug: CategorySlug | null): PeptideSubtype {
  if (mappedSlug !== CATEGORY_SLUGS.PEPTIDES) return null;
  
  const normalized = normalizeCategoryInput(rawCategory);
  
  // Check for injectable keywords
  if (
    normalized.includes("injectable") ||
    normalized.includes("injection") ||
    normalized.includes("injections") ||
    normalized.includes("shots")
  ) {
    return "injectable";
  }
  
  // Check for oral keywords
  if (
    normalized.includes("oral") ||
    normalized.includes("capsule") ||
    normalized.includes("caps") ||
    normalized.includes("pill")
  ) {
    return "oral";
  }
  
  // Check for nasal keywords
  if (
    normalized.includes("nasal") ||
    normalized.includes("spray")
  ) {
    return "nasal";
  }
  
  return null;
}

// Validate category slug is canonical
export function isValidCategorySlug(slug: string): slug is CategorySlug {
  return Object.values(CATEGORY_SLUGS).includes(slug as CategorySlug);
}
