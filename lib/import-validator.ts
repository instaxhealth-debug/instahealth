import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import {
  isServiceCategory,
  isValidBookingUrl,
} from "@/lib/vendor-categories";
import {
  mapCategoryToSlug,
  formatAllowedCategories,
  CATEGORY_DISPLAY_NAMES,
  extractPeptideSubtype,
  type MappingReason,
  type MappingConfidence,
  type CategorySlug,
  type PeptideSubtype,
} from "@/lib/utils/category";
import { classifyServiceType, getDefaultDuration } from "@/lib/service-classifier";
import type { ParsedRow } from "./csv-parser";

export interface ValidationResult {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  action: "create" | "update";
  rawCategory: string;
  mappedCategorySlug: string | null;
  mappingReason: MappingReason | null;
  mappingConfidence: MappingConfidence | null;
  missingCategory: boolean;
  peptideSubtype: PeptideSubtype;
  computedSlug: string | null;
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
    bookingUrl: string | null;
    durationMinutes: number | null;
    inventoryStatus: string;
    serviceType: 'physical-product' | 'appointment-service';
    requiresBooking: boolean;
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
    const warnings: string[] = [];
  const rawCategory = (row.category || "").trim();
  let mappedSlug: string | null = null;
  let mappingReason: MappingReason | null = null;
  let mappingConfidence: MappingConfidence | null = null;
  let missingCategory = false;

  // Fetch vendor to check for vendor-level bookingUrl
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { bookingUrl: true },
  });

  if (!vendor) {
    errors.push("Vendor not found");
    return {
      rowIndex,
      isValid: false,
      errors,
        warnings: [],
      action: "create",
      rawCategory,
      mappedCategorySlug: null,
      mappingReason: null,
      mappingConfidence: null,
      missingCategory: true,
      peptideSubtype: null,
        computedSlug: null,
      data: {} as any,
    };
  }

  // Required fields (except category — handled specially)
  if (!row.name) errors.push("name is required");
  if (!row.priceAED) errors.push("priceAED is required");

  // Price parsing with flexible format support
  let priceAED = 0;
  if (row.priceAED) {
    const priceStr = row.priceAED
      .trim()
      .replace(/^AED\s*/i, "") // Remove AED prefix
      .replace(/,/g, "") // Remove thousands separator
      .trim();
    priceAED = parseFloat(priceStr);
    if (isNaN(priceAED) || priceAED < 0) {
      errors.push("priceAED must be a valid number >= 0 (accepts: 250, 250.00, AED 250, 1,200)");
      priceAED = 0;
    }
  }
  const priceFils = Math.round(priceAED * 100);

  // Category mapping logic — no allowedCategories restriction
  if (!rawCategory && bulkCategory) {
    // Bulk category provided for missing rows
    const mapResult = mapCategoryToSlug(bulkCategory);
    if (mapResult.matched) {
      mappedSlug = mapResult.slug;
      mappingReason = "BULK_ASSIGNED";
      mappingConfidence = "HIGH";
      missingCategory = true;
    } else {
      errors.push(`Invalid bulk category '${bulkCategory}'. Use a valid category slug or label.`);
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
      // For missing category, do NOT block — let them upload but mark as missing
      mappingReason = "MISSING";
      // Only add error if category is truly required
      // For now, we allow missing categories (flexible import)
      // errors.push("category is required");
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
        const displayNames = mapResult.ambiguousSlugs
          .map((s) => `${s} (${CATEGORY_DISPLAY_NAMES[s]})`)
          .join(", ");
        errors.push(
          `Ambiguous category '${rawCategory}' could mean: ${displayNames}. Please be more specific.`,
        );
      } else {
        errors.push(
          `Unable to map category '${rawCategory}'. Try using a standard label like: iv-drips, blood-tests, peptides, supplements, hormones, skincare, haircare, or custom vendor label.`,
        );
      }
    }
  }

  // REMOVED: Permission check for allowedCategories
  // Vendors/admins can now upload CSVs with flexible category values without restriction

  const category = mappedSlug || "";

  // Extract peptide subtype if applicable
  const peptideSubtype = extractPeptideSubtype(rawCategory, mappedSlug as CategorySlug | null);

  // Service-specific
  const isService = category ? isServiceCategory(category) : false;
  const bookingUrl = row.bookingUrl || null;
  const active = parseBoolean(row.active, true);
  const durationMinutes = row.duration ? parseInt(row.duration, 10) : null;

  // Validate bookingUrl if provided (optional fallback)
  if (bookingUrl && !isValidBookingUrl(bookingUrl)) {
    warnings.push("bookingUrl should be a valid HTTPS URL if provided (optional fallback only)");
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

  // Auto-classify service type for appointment-based services
  const classification = classifyServiceType(
    row.name || "",
    category,
    row.description || undefined
  );

  const serviceType = classification.serviceType;
  const requiresBooking = classification.requiresBooking;

  // Add classification info to warnings if confidence is high
  if (classification.confidence > 0.7 && serviceType === 'appointment-service') {
    warnings.push(
      `Auto-classified as appointment service (${(classification.confidence * 100).toFixed(0)}% confidence): ${classification.reason}`
    );
  }

  // Auto-set duration for services if not provided
  const finalDurationMinutes = durationMinutes || (requiresBooking ? getDefaultDuration(category) : null);

  // Parse tags from CSV and add peptide subtype if applicable
  const csvTags = parseTags(row.tags);
  const finalTags = peptideSubtype
    ? Array.from(new Set([...csvTags, peptideSubtype])) // Add subtype tag if not already present
    : csvTags;

  // Compute slug for duplicate detection
  const computedSlug = row.name ? slugify(row.name) : null;

  return {
    rowIndex,
    isValid: errors.length === 0,
      warnings,
    errors,
    action,
    rawCategory,
    mappedCategorySlug: mappedSlug,
    mappingReason,
    mappingConfidence,
    missingCategory,
    peptideSubtype,
      computedSlug,
    data: {
      sku: row.sku || undefined,
      name: row.name || "",
      category,
      priceFils,
      description: row.description || null,
      imageUrl: row.imageUrl || null,
      tags: finalTags,
      published: parseBoolean(row.published, true),
      active,
      inStock: isService ? true : parseBoolean(row.inStock, true),
      isGlobal: parseBoolean(row.isGlobal, false),
      bookingUrl: isService ? bookingUrl : null,
      durationMinutes: finalDurationMinutes,
      inventoryStatus: "in_stock",
      serviceType,
      requiresBooking,
    },
  };
}
