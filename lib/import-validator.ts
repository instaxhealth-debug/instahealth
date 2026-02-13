import { prisma } from "@/lib/prisma";
import {
  isServiceCategory,
  isValidCalendlyUrl,
} from "@/lib/vendor-categories";
import {
  mapCategoryToSlug,
  formatAllowedCategories,
  CATEGORY_DISPLAY_NAMES,
  type MappingReason,
  type MappingConfidence,
  type CategorySlug,
} from "@/lib/utils/category";
import type { ParsedRow } from "./csv-parser";

export interface ValidationResult {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  action: "create" | "update";
  rawCategory: string;
  mappedCategorySlug: string | null;
  mappingReason: MappingReason | null;
  mappingConfidence: MappingConfidence | null;
  missingCategory: boolean;
  data: {
    sku?: string;
    name: string;
    category: string;
    priceFils: number;
    description: string | null;
    imageUrl: string | null;
    tags: string[];
    published: boolean;
    active: boolean;
    inStock: boolean;
    isGlobal: boolean;
    calendlyUrl: string | null;
    inventoryStatus: string;
  };
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const lower = value.toLowerCase();
  return lower === "true" || lower === "1" || lower === "yes";
}

function parseTags(tagsString: string | undefined): string[] {
  if (!tagsString) return [];
  return tagsString
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export async function validateProductRow(
  row: ParsedRow,
  rowIndex: number,
  allowedCategories: string[],
  vendorId: string,
  bulkCategory?: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const rawCategory = (row.category || "").trim();
  let mappedSlug: string | null = null;
  let mappingReason: MappingReason | null = null;
  let mappingConfidence: MappingConfidence | null = null;
  let missingCategory = false;
  const allowedDisplay = formatAllowedCategories(allowedCategories);

  // Required fields (except category — handled specially)
  if (!row.name) errors.push("name is required");
  if (!row.priceAED) errors.push("priceAED is required");

  // Price
  const priceAED = parseFloat(row.priceAED || "0");
  if (row.priceAED && (isNaN(priceAED) || priceAED < 0)) {
    errors.push("priceAED must be a number >= 0");
  }
  const priceFils = Math.round(priceAED * 100);

  // Category mapping logic
  if (!rawCategory && bulkCategory) {
    // Bulk category provided for missing rows
    const mapResult = mapCategoryToSlug(bulkCategory);
    if (mapResult.matched) {
      mappedSlug = mapResult.slug;
      mappingReason = "BULK_ASSIGNED";
      mappingConfidence = "HIGH";
      missingCategory = true;
    } else {
      errors.push(`Invalid bulk category '${bulkCategory}'. Allowed: ${allowedDisplay}`);
      missingCategory = true;
    }
  } else if (!rawCategory) {
    missingCategory = true;
    // Auto-assign if vendor has exactly 1 allowed category
    if (allowedCategories.length === 1) {
      mappedSlug = allowedCategories[0];
      mappingReason = "BULK_ASSIGNED_AUTO_SINGLE";
      mappingConfidence = "HIGH";
    } else {
      mappingReason = "MISSING";
      errors.push(
        `Category missing — choose one of your allowed categories: ${allowedDisplay}`,
      );
    }
  } else {
    // Map the raw input to a canonical slug
    const mapResult = mapCategoryToSlug(rawCategory);
    if (mapResult.matched) {
      mappedSlug = mapResult.slug;
      mappingReason = mapResult.reason;
      mappingConfidence = mapResult.confidence;
    } else {
      if (mapResult.ambiguousSlugs) {
        const ambiguous = formatAllowedCategories(mapResult.ambiguousSlugs);
        errors.push(
          `Ambiguous category '${rawCategory}' could mean: ${ambiguous}. Please set category explicitly.`,
        );
      } else {
        errors.push(
          `Unknown category '${rawCategory}'. Allowed: ${allowedDisplay}`,
        );
      }
    }
  }

  // Permission check: mapped slug must be in vendor's allowed categories
  if (mappedSlug && allowedCategories.length > 0 && !allowedCategories.includes(mappedSlug)) {
    const displayName = CATEGORY_DISPLAY_NAMES[mappedSlug as CategorySlug] || mappedSlug;
    errors.push(
      `Category '${rawCategory}' maps to '${mappedSlug} (${displayName})', but your vendor is only allowed: ${allowedDisplay}`,
    );
    mappedSlug = null;
    mappingReason = null;
    mappingConfidence = null;
  }

  const category = mappedSlug || "";

  // Service-specific
  const isService = category ? isServiceCategory(category) : false;
  const bookingUrl = row.bookingUrl || null;
  const active = parseBoolean(row.active, true);

  if (isService && bookingUrl && !isValidCalendlyUrl(bookingUrl)) {
    errors.push("bookingUrl must be a valid Calendly URL (https://calendly.com/...)");
  }
  if (isService && active && !bookingUrl) {
    errors.push("Active services require a bookingUrl (Calendly URL)");
  }

  // Determine create vs update (always vendor-scoped)
  let action: "create" | "update" = "create";
  if (row.sku) {
    const existing = await prisma.product.findUnique({
      where: { vendorId_sku: { vendorId, sku: row.sku } },
      select: { id: true },
    });
    if (existing) action = "update";
  }

  return {
    rowIndex,
    isValid: errors.length === 0,
    errors,
    action,
    rawCategory,
    mappedCategorySlug: mappedSlug,
    mappingReason,
    mappingConfidence,
    missingCategory,
    data: {
      sku: row.sku || undefined,
      name: row.name || "",
      category,
      priceFils,
      description: row.description || null,
      imageUrl: row.imageUrl || null,
      tags: parseTags(row.tags),
      published: parseBoolean(row.published, true),
      active,
      inStock: isService ? true : parseBoolean(row.inStock, true),
      isGlobal: parseBoolean(row.isGlobal, false),
      calendlyUrl: isService ? bookingUrl : null,
      inventoryStatus: "in_stock",
    },
  };
}
