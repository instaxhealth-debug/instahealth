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

export function isValidCalendlyUrl(url: string) {
  return /^https:\/\/(www\.)?calendly\.com\/.+/i.test(url);
}
