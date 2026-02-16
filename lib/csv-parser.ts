import * as XLSX from "xlsx";

/**
 * CSV Product Importer with Flexible Header Mapping
 * 
 * This parser accepts vendor CSV files with various column naming conventions
 * and maps them to the internal schema. Header matching is case-insensitive
 * with whitespace trimming.
 * 
 * SUPPORTED HEADER ALIASES:
 * - "Price (AED)", "Price", "priceAED" → priceAED
 * - "Category" → category
 * - "Duration" → duration (optional)
 * - "Display Price" → displayPrice (optional)
 * - "Product Name", "name" → name
 * 
 * SUPPORTED CATEGORY ALIASES:
 * - "drip", "drips", "IV", "IV Drip", "IV Drips", "ivdrip", etc. → iv-drips
 * 
 * REQUIRED FIELDS (enforced by validator):
 * - name
 * - priceAED
 * - category
 * 
 * OPTIONAL FIELDS:
 * - duration, displayPrice, description, imageUrl, tags, etc.
 * 
 * The importer will NOT reject rows for missing optional fields.
 */

export interface ParsedRow {
  sku?: string;
  name: string;
  category: string;
  priceAED: string;
  description?: string;
  imageUrl?: string;
  tags?: string;
  published?: string;
  active?: string;
  inStock?: string;
  isGlobal?: string;
  bookingUrl?: string;
  duration?: string;
  displayPrice?: string;
}

/**
 * Header aliases for flexible CSV imports
 * Maps common vendor column names to internal field names
 */
const HEADER_ALIASES: Record<string, string[]> = {
  priceAED: ["priceaed", "price (aed)", "price", "price aed"],
  category: ["category"],
  name: ["name", "product name", "productname"],
  duration: ["duration"],
  displayPrice: ["display price", "displayprice", "display_price"],
  sku: ["sku", "product code", "code"],
  description: ["description", "desc"],
  imageUrl: ["imageurl", "image url", "image", "image_url"],
  tags: ["tags", "tag"],
  published: ["published", "is published", "ispublished"],
  active: ["active", "is active", "isactive"],
  inStock: ["instock", "in stock", "in_stock", "stock"],
  isGlobal: ["isglobal", "is global", "is_global", "global"],
  bookingUrl: ["bookingurl", "booking url", "booking_url", "calendly", "calendlyurl"],
};

/**
 * Category aliases for flexible category matching
 * Maps casual/human-friendly category names to internal category slugs
 */
const CATEGORY_ALIASES: Record<string, string[]> = {
  "iv-drips": [
    "drip",
    "drips",
    "iv drip",
    "iv drips",
    "ivdrip",
    "ivdrips",
    "ivs",
    "iv",
  ],
};

/**
 * Normalize a category string for matching
 */
function normalizeCategory(category: string): string {
  return category
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, " ") // Replace underscores/spaces with single space
    .replace(/\s+/g, " "); // Collapse multiple spaces
}

/**
 * Map a raw category value to the internal category slug
 * Returns the normalized slug if a match is found, otherwise returns original
 */
function mapCategory(rawCategory: string): string {
  const normalized = normalizeCategory(rawCategory);

  // Check all category aliases
  for (const [categorySlug, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.includes(normalized)) {
      return categorySlug;
    }
  }

  // If no alias match, return the original category (trimmed)
  return rawCategory.trim();
}

/**
 * Normalize a header string for matching
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " "); // Collapse multiple spaces
}

/**
 * Map a raw header from the CSV to an internal field name
 */
function mapHeader(rawHeader: string): string | null {
  const normalized = normalizeHeader(rawHeader);

  // Check all field aliases
  for (const [fieldName, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) {
      return fieldName;
    }
  }

  // If no match found, return null
  return null;
}

export async function parseProductCsv(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (workbook.SheetNames.length === 0) {
    throw new Error("File is empty");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rawData.length === 0) {
    throw new Error("No data rows found");
  }

  // Build header mapping from first row
  const firstRow = rawData[0];
  const headerMap = new Map<string, string>();

  for (const rawHeader of Object.keys(firstRow)) {
    const mappedField = mapHeader(rawHeader);
    if (mappedField) {
      headerMap.set(rawHeader, mappedField);
    }
  }

  // Log header mapping for debugging
  console.log("[CSV_PARSER] Header mapping:", Object.fromEntries(headerMap));

  // Transform rows using the header mapping
  return rawData.map((row) => {
    const parsed: Record<string, string | undefined> = {};

    for (const [rawHeader, value] of Object.entries(row)) {
      const mappedField = headerMap.get(rawHeader);
      if (mappedField && value !== null && value !== undefined) {
        parsed[mappedField] = value.toString().trim();
      }
    }

    // Normalize category value if present
    if (parsed.category) {
      parsed.category = mapCategory(parsed.category);
    }

    // Return typed result with defaults for required fields
    return {
      sku: parsed.sku,
      name: parsed.name || "",
      category: parsed.category || "",
      priceAED: parsed.priceAED || "",
      description: parsed.description,
      imageUrl: parsed.imageUrl,
      tags: parsed.tags,
      published: parsed.published,
      active: parsed.active,
      inStock: parsed.inStock,
      isGlobal: parsed.isGlobal,
      bookingUrl: parsed.bookingUrl,
      duration: parsed.duration,
      displayPrice: parsed.displayPrice,
    } as ParsedRow;
  });
}
