/**
 * Product Image Matcher
 *
 * Client-side matching utilities for Smart Match mode in bulk image upload.
 * Implements multiple matching strategies with confidence scoring.
 */

export interface VendorProduct {
  id: string;
  sku: string;
  name: string;
  slug?: string | null;
}

export interface ProductMatchCandidate {
  product: VendorProduct;
  score: number;
  matchType: "exact" | "token-overlap" | "contains" | "fuzzy";
  confidence: "high" | "medium" | "low";
}

export interface ProductMatchResult {
  filename: string;
  candidateKey: string;
  suggestedProduct: VendorProduct | null;
  suggestedSku: string | null;
  confidence: "high" | "medium" | "low" | "none";
  score: number;
  topCandidates: ProductMatchCandidate[];
  autoAccept: boolean;
}

/**
 * Normalize a string for matching:
 * - lowercase
 * - remove file extensions
 * - replace non-alphanumeric with spaces
 * - collapse whitespace
 * - trim
 */
export function normalizeForMatching(input: string): string {
  if (!input) return "";

  return input
    .toLowerCase()
    .replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff?)$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenize a normalized string into unique words
 */
function tokenize(text: string): Set<string> {
  const normalized = normalizeForMatching(text);
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
 * Compute Levenshtein distance between two strings
 * Returns normalized similarity score (0-1)
 */
function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  // Compute distances
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - distance / maxLength;
}

/**
 * Match a product using multiple strategies and return score
 */
function matchProduct(
  candidateKey: string,
  product: VendorProduct
): ProductMatchCandidate {
  const normalizedCandidate = normalizeForMatching(candidateKey);
  const normalizedSku = normalizeForMatching(product.sku);
  const normalizedName = normalizeForMatching(product.name);
  const normalizedSlug = product.slug ? normalizeForMatching(product.slug) : "";

  let bestScore = 0;
  let matchType: ProductMatchCandidate["matchType"] = "fuzzy";

  // Strategy 1: Exact match on normalized strings
  if (
    normalizedCandidate === normalizedSku ||
    normalizedCandidate === normalizedName ||
    (normalizedSlug && normalizedCandidate === normalizedSlug)
  ) {
    bestScore = 1.0;
    matchType = "exact";
  } else {
    // Strategy 2: Token overlap (Jaccard)
    const candidateTokens = tokenize(candidateKey);
    const skuTokens = tokenize(product.sku);
    const nameTokens = tokenize(product.name);
    const slugTokens = product.slug ? tokenize(product.slug) : new Set<string>();

    const jaccardSku = jaccardSimilarity(candidateTokens, skuTokens);
    const jaccardName = jaccardSimilarity(candidateTokens, nameTokens);
    const jaccardSlug = product.slug
      ? jaccardSimilarity(candidateTokens, slugTokens)
      : 0;

    const maxJaccard = Math.max(jaccardSku, jaccardName, jaccardSlug);

    if (maxJaccard >= 0.5) {
      bestScore = maxJaccard;
      matchType = "token-overlap";
    } else {
      // Strategy 3: Contains match (substring)
      if (
        normalizedSku.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedSku) ||
        normalizedName.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedName)
      ) {
        // Score based on length ratio
        const containsScore = Math.min(
          normalizedCandidate.length / normalizedSku.length,
          normalizedSku.length / normalizedCandidate.length,
          normalizedCandidate.length / normalizedName.length,
          normalizedName.length / normalizedCandidate.length
        );
        bestScore = Math.max(bestScore, containsScore * 0.8); // Cap at 0.8 for contains
        matchType = "contains";
      }

      // Strategy 4: Levenshtein similarity fallback
      const levSku = levenshteinSimilarity(normalizedCandidate, normalizedSku);
      const levName = levenshteinSimilarity(normalizedCandidate, normalizedName);
      const levSlug = product.slug
        ? levenshteinSimilarity(normalizedCandidate, normalizedSlug)
        : 0;

      const maxLev = Math.max(levSku, levName, levSlug);
      if (maxLev > bestScore) {
        bestScore = maxLev;
        matchType = "fuzzy";
      }
    }
  }

  // Determine confidence level
  let confidence: ProductMatchCandidate["confidence"];
  if (bestScore >= 0.9) {
    confidence = "high";
  } else if (bestScore >= 0.7) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    product,
    score: bestScore,
    matchType,
    confidence,
  };
}

/**
 * Find best product match for a filename
 *
 * Auto-accept criteria:
 * - bestScore >= 0.92
 * - gap between best and second best >= 0.08
 *
 * @param filename - Image filename (e.g., "epithalon.png")
 * @param products - Vendor's products
 * @param topN - Number of candidates to return (default: 3)
 */
export function findProductMatch(
  filename: string,
  products: VendorProduct[],
  topN: number = 3
): ProductMatchResult {
  if (!filename || products.length === 0) {
    return {
      filename,
      candidateKey: "",
      suggestedProduct: null,
      suggestedSku: null,
      confidence: "none",
      score: 0,
      topCandidates: [],
      autoAccept: false,
    };
  }

  // Derive candidate key from filename
  const candidateKey = normalizeForMatching(filename);

  // Match against all products
  const matches = products
    .map((product) => matchProduct(candidateKey, product))
    .sort((a, b) => b.score - a.score);

  // Get top N candidates
  const topCandidates = matches.slice(0, topN);

  if (topCandidates.length === 0) {
    return {
      filename,
      candidateKey,
      suggestedProduct: null,
      suggestedSku: null,
      confidence: "none",
      score: 0,
      topCandidates: [],
      autoAccept: false,
    };
  }

  const bestMatch = topCandidates[0];
  const secondBest = topCandidates[1];

  // Auto-accept criteria
  const bestScore = bestMatch.score;
  const gap = secondBest ? bestScore - secondBest.score : 1.0;
  const autoAccept = bestScore >= 0.92 && gap >= 0.08;

  return {
    filename,
    candidateKey,
    suggestedProduct: bestMatch.product,
    suggestedSku: bestMatch.product.sku,
    confidence: bestMatch.confidence,
    score: bestScore,
    topCandidates,
    autoAccept,
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
