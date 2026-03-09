const CATEGORY_ALIASES: Record<string, string> = {
  doctor_consultation: "consultations",
  iv_drips: "iv-drips",
  blood_tests: "blood-tests",
  physical_products: "physical-products",
};

export const SERVICE_CATEGORIES = [
  "consultations",
  "iv-drips",
  "blood-tests",
  "clinics",
] as const;

export const PRODUCT_CATEGORIES = [
  "peptides",
  "amino-acids",
  "supplements",
  "physical-products",
  "hormones",
  "skincare",
  "haircare",
  "insurance",
] as const;

export const SERVICE_CATEGORY_SET = new Set<string>(SERVICE_CATEGORIES);

export function normalizeCategory(category: string) {
  const trimmed = category.trim();
  return CATEGORY_ALIASES[trimmed] || trimmed;
}

export function isServiceCategory(category: string) {
  const normalized = normalizeCategory(category);
  return SERVICE_CATEGORY_SET.has(normalized);
}

export function isProductCategory(category: string) {
  return !isServiceCategory(category);
}

/**
 * Validate booking URL - accepts Calendly, Acuity, Fresha, Square, and generic HTTPS URLs
 */
export function isValidBookingUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const trimmed = url.trim();
  
  // Must be HTTPS
  if (!trimmed.startsWith('https://')) return false;
  
  // Supported platforms (case-insensitive)
  const supportedPlatforms = [
    'calendly.com',
    'acuityscheduling.com',
    'fresha.com',
    'square.site',
    'squareup.com',
  ];
  
  try {
    const urlObj = new URL(trimmed);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a known platform
    const isKnownPlatform = supportedPlatforms.some(platform => 
      hostname === platform || hostname.endsWith(`.${platform}`)
    );
    
    // Allow known platforms or any valid HTTPS URL with a path
    return isKnownPlatform || (urlObj.pathname !== '/' && urlObj.pathname.length > 1);
  } catch {
    return false;
  }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use isValidBookingUrl instead
 */
export function isValidCalendlyUrl(url: string) {
  if (!url) return false;
  return /^https:\/\/(www\.)?calendly\.com\/.+/i.test(url);
}
