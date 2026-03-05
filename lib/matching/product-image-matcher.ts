/**
 * Product Image Matcher - Smart Match 2.0 (Bulletproof Deterministic Version)
 *
 * Layered matching system with NO fuzzy guessing:
 * 1. EXACT_SKU: Exact SKU match (if SKU exists) → auto-confirmed
 * 2. EXACT_NAME: Exact name match → auto-confirmed
 * 3. HIGH: Strong token overlap (≥80%) → auto-selected
 * 4. MEDIUM: Weak token overlap → manual confirm required
 * 5. NONE: No confident match → user must choose manually
 */

export interface VendorProduct {
  id: string;
  sku: string | null;
  name: string;
  slug?: string | null;
}

export type MatchConfidence = "exact_sku" | "exact_name" | "high" | "medium" | "none";

export interface ProductMatchCandidate {
  product: VendorProduct;
  score: number;
  matchType: "exact_sku" | "exact_name" | "token_overlap" | "weak";
  confidence: MatchConfidence;
}

export interface ProductMatchResult {
  filename: string;
  candidateKey: string;
  suggestedProduct: VendorProduct | null;
  confidence: MatchConfidence;
  score: number;
  topCandidates: ProductMatchCandidate[];
  autoConfirm: boolean;
}

/**
 * Stopwords to ignore during matching
 */
const STOPWORDS = new Set([
  "mg",
  "ml",
  "vial",
  "pack",
  "kit",
  "bundle",
  "drip",
  "iv",
  "injection",
  "capsule",
  "tablet",
  "bottle",
]);

/**
 * Normalize string for matching:
 * - lowercase
 * - remove file extensions
 * - normalize numbers: "10mg" → "10 mg"
 * - remove stopwords
 * - collapse whitespace
 */
export function normalizeForMatching(input?: string | null): string {
  if (!input) return "";

  const safe = String(input);
  if (!safe) return "";

  let normalized = safe
    .toLowerCase()
    .replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff?)$/i, "")
    .replace(/(\d+)(mg|ml|mcg|iu|g|kg)/gi, "$1 $2") // Number normalization
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove stopwords
  const tokens = normalized.split(" ").filter((token) => {
    return token.length > 0 && !STOPWORDS.has(token);
  });

  return tokens.join(" ");
}

/**
 * Tokenize normalized string into unique words
 */
function tokenize(text?: string | null): Set<string> {
  const normalized = normalizeForMatching(text);
  if (!normalized) return new Set<string>();
  return new Set(normalized.split(" ").filter((token) => token.length > 0));
}

/**
 * Compute Jaccard similarity between two token sets
 * Jaccard = |intersection| / |union|
 */
function jaccardSimilarity(tokensA: Set<string>, tokensB: Set<string>): number {
  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Deterministic layered matching
 *
 * Priority order:
 * 1. EXACT_SKU (score = 1.0, auto-confirm)
 * 2. EXACT_NAME (score = 0.99, auto-confirm)
 * 3. HIGH (Jaccard ≥ 0.8, auto-select)
 * 4. MEDIUM (Jaccard ≥ 0.5, manual confirm)
 * 5. NONE (Jaccard < 0.5, user must choose)
 */
function matchProduct(
  candidateKey: string,
  product: VendorProduct
): ProductMatchCandidate {
  const normalizedCandidate = normalizeForMatching(candidateKey);
  const normalizedSku = normalizeForMatching(product.sku);
  const normalizedName = normalizeForMatching(product.name);

  // Layer 1: EXACT SKU match (if SKU exists)
  if (product.sku && normalizedCandidate === normalizedSku) {
    return {
      product,
      score: 1.0,
      matchType: "exact_sku",
      confidence: "exact_sku",
    };
  }

  // Layer 2: EXACT NAME match
  if (normalizedCandidate === normalizedName) {
    return {
      product,
      score: 0.99,
      matchType: "exact_name",
      confidence: "exact_name",
    };
  }

  // Layer 3-4: Token overlap (Jaccard similarity)
  const candidateTokens = tokenize(candidateKey);
  const skuTokens = tokenize(product.sku);
  const nameTokens = tokenize(product.name);

  const jaccardSku = jaccardSimilarity(candidateTokens, skuTokens);
  const jaccardName = jaccardSimilarity(candidateTokens, nameTokens);
  const maxJaccard = Math.max(jaccardSku, jaccardName);

  // Layer 3: HIGH confidence (≥80% token overlap)
  if (maxJaccard >= 0.8) {
    return {
      product,
      score: maxJaccard,
      matchType: "token_overlap",
      confidence: "high",
    };
  }

  // Layer 4: MEDIUM confidence (≥50% token overlap)
  if (maxJaccard >= 0.5) {
    return {
      product,
      score: maxJaccard,
      matchType: "token_overlap",
      confidence: "medium",
    };
  }

  // Layer 5: NONE (weak match)
  return {
    product,
    score: maxJaccard,
    matchType: "weak",
    confidence: "none",
  };
}

/**
 * Find best product match for a filename
 *
 * Auto-confirm ONLY for:
 * - exact_sku
 * - exact_name
 *
 * Auto-select (pre-fill but allow change) for:
 * - high confidence
 *
 * Manual confirmation required for:
 * - medium confidence
 * - none (no confident match)
 */
export function findProductMatch(
  filename: string,
  products: VendorProduct[],
  topN: number = 5
): ProductMatchResult {
  if (!filename || products.length === 0) {
    return {
      filename,
      candidateKey: "",
      suggestedProduct: null,
      confidence: "none",
      score: 0,
      topCandidates: [],
      autoConfirm: false,
    };
  }

  // Derive candidate key from filename
  const candidateKey = normalizeForMatching(filename);

  // Match against all products
  const matches = products
    .map((product) => matchProduct(candidateKey, product))
    .sort((a, b) => {
      // Sort by score descending
      if (b.score !== a.score) return b.score - a.score;

      // Tie-breaker: prefer products WITH SKU
      const aHasSku = a.product.sku ? 1 : 0;
      const bHasSku = b.product.sku ? 1 : 0;
      return bHasSku - aHasSku;
    });

  // Get top N candidates
  const topCandidates = matches.slice(0, topN);

  if (topCandidates.length === 0) {
    return {
      filename,
      candidateKey,
      suggestedProduct: null,
      confidence: "none",
      score: 0,
      topCandidates: [],
      autoConfirm: false,
    };
  }

  const bestMatch = topCandidates[0];

  // Auto-confirm ONLY for exact matches
  const autoConfirm =
    bestMatch.confidence === "exact_sku" ||
    bestMatch.confidence === "exact_name";

  return {
    filename,
    candidateKey,
    suggestedProduct: bestMatch.product,
    confidence: bestMatch.confidence,
    score: bestMatch.score,
    topCandidates,
    autoConfirm,
  };
}

/**
 * Batch match multiple files against products
 */
export function batchMatchFiles(
  filenames: string[],
  products: VendorProduct[]
): ProductMatchResult[] {
  return filenames.map((filename) => findProductMatch(filename, products));
}
