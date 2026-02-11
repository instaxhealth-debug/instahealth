import * as XLSX from "xlsx";

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
}

export async function parseProductCsv(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (workbook.SheetNames.length === 0) {
    throw new Error("File is empty");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (data.length === 0) {
    throw new Error("No data rows found");
  }

  return data.map((row) => ({
    sku: row.sku?.toString().trim() || undefined,
    name: row.name?.toString().trim() || "",
    category: row.category?.toString().trim() || "",
    priceAED: row.priceAED?.toString().trim() || "",
    description: row.description?.toString().trim() || undefined,
    imageUrl: row.imageUrl?.toString().trim() || undefined,
    tags: row.tags?.toString().trim() || undefined,
    published: row.published?.toString().trim() || undefined,
    active: row.active?.toString().trim() || undefined,
    inStock: row.inStock?.toString().trim() || undefined,
    isGlobal: row.isGlobal?.toString().trim() || undefined,
    bookingUrl: row.bookingUrl?.toString().trim() || undefined,
  }));
}
