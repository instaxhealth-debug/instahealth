/**
 * CSV Parser for Image Import
 *
 * Parses CSV files for bulk image import
 * Supports two formats:
 * 1. URL import: sku,imageUrl
 * 2. File mapping: sku,filename
 */

export interface ImageCsvRow {
  sku: string;
  imageUrl?: string;
  filename?: string;
}

export interface ParseResult {
  rows: ImageCsvRow[];
  errors: Array<{ row: number; error: string }>;
}

/**
 * Parse CSV content for image import
 * Supports both URL and filename mapping formats
 */
export async function parseImageCsv(file: File): Promise<ParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, error: "CSV file is empty" }] };
  }

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  if (!header.includes("sku")) {
    return {
      rows: [],
      errors: [{ row: 1, error: 'CSV must have a "sku" column' }],
    };
  }

  const hasImageUrl = header.includes("imageurl");
  const hasFilename = header.includes("filename");

  if (!hasImageUrl && !hasFilename) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          error: 'CSV must have either "imageUrl" or "filename" column',
        },
      ],
    };
  }

  const skuIndex = header.indexOf("sku");
  const imageUrlIndex = hasImageUrl ? header.indexOf("imageurl") : -1;
  const filenameIndex = hasFilename ? header.indexOf("filename") : -1;

  const rows: ImageCsvRow[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    // Simple CSV parsing (handles quoted values)
    const columns = parseCsvLine(line);

    if (columns.length <= skuIndex) {
      errors.push({ row: i + 1, error: "Missing SKU column" });
      continue;
    }

    const sku = columns[skuIndex]?.trim();
    if (!sku) {
      errors.push({ row: i + 1, error: "SKU is empty" });
      continue;
    }

    const row: ImageCsvRow = { sku };

    if (hasImageUrl && imageUrlIndex >= 0 && columns.length > imageUrlIndex) {
      row.imageUrl = columns[imageUrlIndex]?.trim() || "";
    }

    if (hasFilename && filenameIndex >= 0 && columns.length > filenameIndex) {
      row.filename = columns[filenameIndex]?.trim() || "";
    }

    rows.push(row);
  }

  return { rows, errors };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

/**
 * Generate CSV template for URL import
 */
export function generateUrlImportTemplate(): string {
  return `sku,imageUrl
ABC123,https://example.com/images/product1.jpg
XYZ789,https://example.com/images/product2.png
DEF456,https://example.com/images/product3.webp`;
}

/**
 * Generate CSV template for filename mapping
 */
export function generateFilenameMapTemplate(): string {
  return `sku,filename
ABC123,product1.jpg
XYZ789,product2.png
DEF456,product3.webp`;
}
