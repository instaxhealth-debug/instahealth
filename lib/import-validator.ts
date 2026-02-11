import { prisma } from "@/lib/prisma";
import {
  normalizeCategory,
  isServiceCategory,
  isValidCalendlyUrl,
} from "@/lib/vendor-categories";
import type { ParsedRow } from "./csv-parser";

export interface ValidationResult {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  action: "create" | "update";
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
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Required fields
  if (!row.name) errors.push("name is required");
  if (!row.category) errors.push("category is required");
  if (!row.priceAED) errors.push("priceAED is required");

  // Price
  const priceAED = parseFloat(row.priceAED || "0");
  if (row.priceAED && (isNaN(priceAED) || priceAED < 0)) {
    errors.push("priceAED must be a number >= 0");
  }
  const priceFils = Math.round(priceAED * 100);

  // Category
  const category = normalizeCategory(row.category || "");
  const normalizedAllowed = allowedCategories.map(normalizeCategory);
  if (row.category && normalizedAllowed.length > 0 && !normalizedAllowed.includes(category)) {
    errors.push(`Category "${row.category}" is not in your allowed categories`);
  }

  // Service-specific
  const isService = isServiceCategory(category);
  const bookingUrl = row.bookingUrl || null;
  const active = parseBoolean(row.active, true);

  if (isService && bookingUrl && !isValidCalendlyUrl(bookingUrl)) {
    errors.push("bookingUrl must be a valid Calendly URL (https://calendly.com/...)");
  }
  if (isService && active && !bookingUrl) {
    errors.push("Active services require a bookingUrl (Calendly URL)");
  }

  // SKU warning
  if (!row.sku) {
    // Not an error, but create-only
  }

  // Determine create vs update
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
