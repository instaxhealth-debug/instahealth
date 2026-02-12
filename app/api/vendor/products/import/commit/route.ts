import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { parseProductCsv } from "@/lib/csv-parser";
import { validateProductRow } from "@/lib/import-validator";
import { isValidCategorySlug, formatAllowedCategories } from "@/lib/utils/category";
import { slugify } from "@/lib/slugify";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BATCH_SIZE = 50;
const IMPORT_SCHEMA_VERSION = 1;

/** Must match preview route's computePreviewId exactly */
function computePreviewId(
  fileContentHash: string,
  vendorId: string,
  allowedCategories: string[],
  bulkCategory: string,
): string {
  const payload = [fileContentHash, vendorId, [...allowedCategories].sort().join(","), bulkCategory, IMPORT_SCHEMA_VERSION].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const { vendorId } = await requireVendor();

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { allowedCategories: true },
    });

    if (!vendor) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", requestId, message: "Vendor not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", requestId, message: "No file provided" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", requestId, message: "File too large (max 10MB)" },
        { status: 400 },
      );
    }

    // Validate bulkCategory if provided
    const bulkCategoryRaw = (formData.get("bulkCategory") as string | null) || "";
    const bulkCategory = bulkCategoryRaw.trim();
    if (bulkCategory) {
      if (!isValidCategorySlug(bulkCategory)) {
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", requestId, message: `Invalid bulk category '${bulkCategory}'. Must be a canonical slug.` },
          { status: 400 },
        );
      }
      if (vendor.allowedCategories.length > 0 && !vendor.allowedCategories.includes(bulkCategory)) {
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", requestId, message: `Bulk category '${bulkCategory}' is not in your allowed categories. Allowed: ${formatAllowedCategories(vendor.allowedCategories)}` },
          { status: 400 },
        );
      }
    }

    // TOCTOU protection: verify previewId matches
    const clientPreviewId = (formData.get("previewId") as string | null) || "";
    const fileBuffer = await file.arrayBuffer();
    const fileContentHash = crypto.createHash("sha256").update(Buffer.from(fileBuffer)).digest("hex");
    const expectedPreviewId = computePreviewId(fileContentHash, vendorId, vendor.allowedCategories, bulkCategory);

    if (!clientPreviewId || clientPreviewId !== expectedPreviewId) {
      return NextResponse.json(
        { ok: false, code: "PREVIEW_OUTDATED", requestId, message: "Preview is outdated. Re-run preview." },
        { status: 409 },
      );
    }

    // Re-validate (never trust client)
    const fileBlob = new File([fileBuffer], file.name, { type: file.type });
    const rows = await parseProductCsv(fileBlob);
    const results = await Promise.all(
      rows.map((row, i) =>
        validateProductRow(row, i + 1, vendor.allowedCategories, vendorId, bulkCategory || undefined),
      ),
    );

    const validResults = results.filter((r) => r.isValid);
    const invalidResults = results.filter((r) => !r.isValid);

    const importStart = Date.now();
    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ row: number; field?: string; message: string }> = [];

    // Add invalid row errors
    for (const inv of invalidResults) {
      for (const errMsg of inv.errors) {
        errors.push({ row: inv.rowIndex, message: errMsg });
      }
    }

    // Phase 1: Separate rows into creates (with SKU, without SKU) and updates
    // Validate first, then write — no side effects inside DB writes
    const toUpsertBySku: typeof validResults = [];
    const toCreateNoSku: typeof validResults = [];

    for (const result of validResults) {
      if (result.data.sku) {
        toUpsertBySku.push(result);
      } else {
        toCreateNoSku.push(result);
      }
    }

    // Phase 2: Process SKU rows — upsert per row, chunked (no interactive tx)
    const skuChunks: typeof toUpsertBySku[] = [];
    for (let i = 0; i < toUpsertBySku.length; i += BATCH_SIZE) {
      skuChunks.push(toUpsertBySku.slice(i, i + BATCH_SIZE));
    }

    for (let ci = 0; ci < skuChunks.length; ci++) {
      const chunkStart = Date.now();
      const chunk = skuChunks[ci];

      for (const result of chunk) {
        const { sku, name, category, priceFils, ...rest } = result.data;
        if (!sku) continue; // type guard

        try {
          const existing = await prisma.product.findUnique({
            where: { vendorId_sku: { vendorId, sku } },
            select: { id: true },
          });

          if (existing) {
            await prisma.product.update({
              where: { id: existing.id },
              data: { name, category, priceFils, ...rest },
            });
            updated++;
          } else {
            const slug = await generateUniqueSlug(name);
            await prisma.product.create({
              data: { vendorId, sku, name, slug, category, priceFils, ...rest },
            });
            created++;
          }
        } catch (rowErr: unknown) {
          failed++;
          const msg = (rowErr as Error).message || "Database write failed";
          console.error(
            `[PRODUCT_IMPORT_ERROR] requestId=${requestId} row=${result.rowIndex} errMessage=${msg}`,
          );
          errors.push({ row: result.rowIndex, message: msg });
        }
      }

      console.log(
        `[PRODUCT_IMPORT_CHUNK] requestId=${requestId} skuChunk=${ci + 1}/${skuChunks.length} rows=${chunk.length} elapsed=${Date.now() - chunkStart}ms`,
      );
    }

    // Phase 3: Process no-SKU rows — create only, chunked with batch createMany where possible
    const noSkuChunks: typeof toCreateNoSku[] = [];
    for (let i = 0; i < toCreateNoSku.length; i += BATCH_SIZE) {
      noSkuChunks.push(toCreateNoSku.slice(i, i + BATCH_SIZE));
    }

    for (let ci = 0; ci < noSkuChunks.length; ci++) {
      const chunkStart = Date.now();
      const chunk = noSkuChunks[ci];

      // Each no-SKU row needs a unique slug, so process individually
      for (const result of chunk) {
        const { name, category, priceFils, ...rest } = result.data;

        try {
          const slug = await generateUniqueSlug(name);
          await prisma.product.create({
            data: { vendorId, name, slug, category, priceFils, ...rest },
          });
          created++;
        } catch (rowErr: unknown) {
          failed++;
          const msg = (rowErr as Error).message || "Database write failed";
          console.error(
            `[PRODUCT_IMPORT_ERROR] requestId=${requestId} row=${result.rowIndex} errMessage=${msg}`,
          );
          errors.push({ row: result.rowIndex, message: msg });
        }
      }

      console.log(
        `[PRODUCT_IMPORT_CHUNK] requestId=${requestId} noSkuChunk=${ci + 1}/${noSkuChunks.length} rows=${chunk.length} elapsed=${Date.now() - chunkStart}ms`,
      );
    }

    // Revalidate marketplace
    revalidatePath("/marketplace", "layout");
    revalidatePath("/vendor/products", "page");

    const totalMs = Date.now() - importStart;
    console.log(
      `[PRODUCT_IMPORT] requestId=${requestId} created=${created} updated=${updated} failed=${failed} totalMs=${totalMs}`,
    );

    return NextResponse.json({
      ok: true,
      requestId,
      created,
      updated,
      skipped: invalidResults.length,
      failed,
      errors,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[PRODUCT_IMPORT_ERROR] requestId=${requestId} errMessage=${err.message}`);

    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", requestId, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (err.message === "FORBIDDEN") {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", requestId, message: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", requestId, message: err.message || "Import failed" },
      { status: 500 },
    );
  }
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  const existing = await prisma.product.findUnique({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${Date.now().toString(36)}`;
}
