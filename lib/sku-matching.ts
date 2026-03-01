/**
 * SKU Matching Utilities
 *
 * Provides fuzzy matching and normalization for product SKUs
 * to improve bulk upload success rates while maintaining safety.
 */

/**
 * Normalize a SKU candidate for matching
 *
 * Rules:
 * - Lowercase
 * - Trim whitespace
 * - Remove file extensions (.jpg, .png, .webp, etc.)
 * - Replace spaces/underscores with hyphens
 * - Remove common suffixes: (1), (2), copy, final, edited, etc.
 * - Collapse repeated hyphens
 */
export function normalizeSkuCandidate(input: string): string {
  if (!input) return "";

  let normalized = input
    .toLowerCase()
    .trim()
    // Remove file extensions
    .replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff?)$/i, "")
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Remove common suffixes with optional parentheses/brackets
    .replace(/[-_]?\(?\d+\)?$/g, "") // (1), (2), _1, -2, etc.
    .replace(/[-_]?(copy|final|edited|new|old|temp|draft)$/gi, "")
    // Remove duplicate suffixes that might remain
    .replace(/[-_]+(copy|final|edited|new|old|temp|draft)[-_]*$/gi, "")
    // Collapse repeated hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");

  return normalized;
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 *
 * Returns a score between 0 (no match) and 1 (exact match)
 * Jaro-Winkler gives more weight to strings that match from the beginning
 *
 * @param s1 First string
 * @param s2 Second string
 * @returns Similarity score (0-1)
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  // Handle edge cases
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;

  // Maximum allowed distance for matches
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchDistance < 0) return 0.0;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  // Calculate Jaro similarity
  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Calculate common prefix length (up to 4 characters)
  let prefixLength = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefixLength++;
    else break;
  }

  // Calculate Jaro-Winkler similarity
  // p is a scaling factor (standard value is 0.1)
  const p = 0.1;
  const jaroWinkler = jaro + prefixLength * p * (1 - jaro);

  return jaroWinkler;
}

/**
 * SKU match result with similarity score
 */
export interface SkuMatch {
  sku: string;
  productId: string;
  productName: string;
  score: number;
  isExactMatch: boolean;
}

/**
 * Find SKU matches with similarity scoring
 *
 * @param candidateSku The SKU derived from filename
 * @param vendorProducts Array of vendor's products with {id, sku, name}
 * @param topN Number of top matches to return
 * @returns Array of matches sorted by score (best first)
 */
export function findSkuMatches(
  candidateSku: string,
  vendorProducts: Array<{ id: string; sku: string; name: string }>,
  topN: number = 3
): SkuMatch[] {
  const normalizedCandidate = normalizeSkuCandidate(candidateSku);

  // Try exact match first on normalized SKUs
  const exactMatch = vendorProducts.find(
    (p) => normalizeSkuCandidate(p.sku) === normalizedCandidate
  );

  if (exactMatch) {
    return [
      {
        sku: exactMatch.sku,
        productId: exactMatch.id,
        productName: exactMatch.name,
        score: 1.0,
        isExactMatch: true,
      },
    ];
  }

  // No exact match - compute similarity scores
  const scoredMatches = vendorProducts
    .map((product) => {
      const normalizedProductSku = normalizeSkuCandidate(product.sku);
      const score = jaroWinklerSimilarity(normalizedCandidate, normalizedProductSku);

      return {
        sku: product.sku,
        productId: product.id,
        productName: product.name,
        score,
        isExactMatch: false,
      };
    })
    .filter((match) => match.score > 0.5) // Only return reasonable matches
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, topN); // Take top N

  return scoredMatches;
}

/**
 * Determine if a match is safe for auto-assignment
 *
 * Criteria:
 * - Best score >= 0.98 (extremely high confidence)
 * - Second best score is far behind (gap >= 0.05)
 * - SKU length >= 6 (avoid short ambiguous codes)
 *
 * @param matches Array of SKU matches sorted by score
 * @returns true if safe to auto-assign, false if confirmation required
 */
export function isSafeAutoAssignment(matches: SkuMatch[]): boolean {
  if (matches.length === 0) return false;

  const bestMatch = matches[0];
  const secondBestMatch = matches[1];

  // Exact matches are always safe
  if (bestMatch.isExactMatch) return true;

  // Check SKU length requirement
  if (bestMatch.sku.length < 6) return false;

  // Check best score threshold
  if (bestMatch.score < 0.98) return false;

  // If there's a second match, check the gap
  if (secondBestMatch) {
    const gap = bestMatch.score - secondBestMatch.score;
    if (gap < 0.05) return false; // Too close, require confirmation
  }

  return true;
}

/**
 * Format a match score as a percentage for display
 */
export function formatMatchScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}
