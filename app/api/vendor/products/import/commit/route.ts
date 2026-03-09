import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseProductCsv } from "@/lib/csv-parser";
import { validateProductRow } from "@/lib/import-validator";
import { isValidCategorySlug, formatAllowedCategories } from "@/lib/utils/category";
import { slugify } from "@/lib/slugify";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BATCH_SIZE = 50;
const IMPORT_SCHEMA_VERSION = 1;
const MAX_SLUG_RETRIES = 10;

type RowImportResult = {
  rowNumber: number;
  sku?: string | null;
  name: string;
  status: "created" | "updated" | "skipped" | "failed";
  reason?: string;
};

/** Compute deterministic importKey for products without SKU */
function computeImportKey(name: string, category: string, priceFils: number): string {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, " ");
  const payload = `${normalized}|${category}|${priceFils}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

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
    const rowResults: RowImportResult[] = [];
    const rowErrors: Array<{
      rowNumber: number;
      sku?: string | null;
      name?: string | null;
      message: string;
    }> = [];

    // Add invalid row errors
    for (const inv of invalidResults) {
            rowResults.push({
              rowNumber: inv.rowIndex,
              sku: inv.data.sku ?? null,
              name: inv.data.name || "Unknown",
              status: "failed",
              reason: inv.errors.join("; "),
            });
      for (const errMsg of inv.errors) {
          rowErrors.push({
            rowNumber: inv.rowIndex,
            sku: inv.data.sku ?? null,
            name: inv.data.name ?? null,
            message: errMsg,
          });
      }
    }

    // Phase 1: Separate rows by SKU presence
    const withSku: typeof validResults = [];
    const withoutSku: typeof validResults = [];
    for (const result of validResults) {
      if (result.data.sku) {
        withSku.push(result);
      } else {
        withoutSku.push(result);
      }
    }

    // Phase 2: SKU rows — batch lookup then split into creates vs updates
    for (let i = 0; i < withSku.length; i += BATCH_SIZE) {
      const chunkStart = Date.now();
      const chunk = withSku.slice(i, i + BATCH_SIZE);
      const ci = Math.floor(i / BATCH_SIZE);
      const totalChunks = Math.ceil(withSku.length / BATCH_SIZE);

      // Single batch query: find all existing products for this chunk's SKUs
      const skusInChunk = chunk.map((r) => r.data.sku!);
      const existingProducts = await prisma.product.findMany({
        where: { vendorId, sku: { in: skusInChunk } },
        select: { id: true, sku: true },
      });
      const existingBysku = new Map(existingProducts.map((p) => [p.sku, p.id]));

      // Split into updates and creates
      const toUpdate: typeof chunk = [];
      const toCreate: typeof chunk = [];
      for (const result of chunk) {
        if (existingBysku.has(result.data.sku!)) {
          toUpdate.push(result);
        } else {
          toCreate.push(result);
        }
      }

      // Batch updates (per-row — Prisma has no bulk updateMany with different data)
      for (const result of toUpdate) {
        const { sku, name, category, priceFils, ...rest } = result.data;
        if (!sku) continue;
        try {
          await prisma.product.update({
            where: { vendorId_sku: { vendorId, sku } },
            data: { name, category, priceFils, ...rest },
            // slug and importKey intentionally not updated — preserve existing values
          });
          rowResults.push({
            rowNumber: result.rowIndex,
            sku: result.data.sku ?? null,
            name: result.data.name,
            status: "updated",
          });
        } catch (rowErr: unknown) {
          const msg = (rowErr as Error).message || "Database write failed";
          console.error(`[PRODUCT_IMPORT_ERROR] requestId=${requestId} row=${result.rowIndex} errMessage=${msg}`);
          rowResults.push({
            rowNumber: result.rowIndex,
            sku: result.data.sku ?? null,
            name: result.data.name,
            status: "failed",
            reason: msg,
          });
          rowErrors.push({
            rowNumber: result.rowIndex,
            sku: result.data.sku ?? null,
            name: result.data.name ?? null,
            message: msg,
          });
        }
      }

      // Batch creates using createMany with skipDuplicates (idempotent)
      if (toCreate.length > 0) {
        // Individual creates with row-level tracking
        for (const result of toCreate) {
          const { sku, name, category, priceFils, ...rest } = result.data;
          if (!sku) continue;
          try {
            await createProductWithSlugRetry({ vendorId, sku, name, category, priceFils, ...rest });
            rowResults.push({
              rowNumber: result.rowIndex,
              sku: result.data.sku ?? null,
              name: result.data.name,
              status: "created",
            });
          } catch (rowErr: unknown) {
            const prismaErr = rowErr as { code?: string; meta?: { target?: string[] } };
            let msg = (rowErr as Error).message || "Database write failed";
            let status: "skipped" | "failed" = "failed";
            
            // P2002 = unique constraint violation (duplicate)
            if (prismaErr.code === "P2002") {
              const target = prismaErr.meta?.target?.join(", ") || "unknown field";
              msg = `Duplicate ${target} conflict`;
              status = "skipped";
            }
            
            console.error(`[PRODUCT_IMPORT_ERROR] requestId=${requestId} row=${result.rowIndex} status=${status} errMessage=${msg}`);
            rowResults.push({
              rowNumber: result.rowIndex,
              sku: result.data.sku ?? null,
              name: result.data.name,
              status,
              reason: msg,
            });
            
            if (status === "failed") {
              rowErrors.push({
                rowNumber: result.rowIndex,
                sku: result.data.sku ?? null,
                name: result.data.name ?? null,
                message: msg,
              });
            }
          }
        }
      }

      console.log(
        `[PRODUCT_IMPORT_CHUNK] requestId=${requestId} skuChunk=${ci + 1}/${totalChunks} rows=${chunk.length} updates=${toUpdate.length} creates=${toCreate.length} elapsed=${Date.now() - chunkStart}ms`,
      );
    }

    // Phase 3: No-SKU rows — use importKey for idempotency
    for (let i = 0; i < withoutSku.length; i += BATCH_SIZE) {
      const chunkStart = Date.now();
      const chunk = withoutSku.slice(i, i + BATCH_SIZE);
      const ci = Math.floor(i / BATCH_SIZE);
      const totalChunks = Math.ceil(withoutSku.length / BATCH_SIZE);

      // Compute importKeys for this chunk
      const importKeysInChunk = chunk.map((r) => computeImportKey(r.data.name, r.data.category, r.data.priceFils));
      
      // Batch lookup existing products by importKey
      const existingProducts = await prisma.product.findMany({
        where: { vendorId, importKey: { in: importKeysInChunk } },
        select: { id: true, importKey: true },
      });
      const existingByImportKey = new Map(existingProducts.map((p) => [p.importKey!, p.id]));

      // Split into updates and creates
      const toUpdate: Array<{ result: typeof chunk[0]; importKey: string }> = [];
      const toCreate: Array<{ result: typeof chunk[0]; importKey: string }> = [];
      for (let j = 0; j < chunk.length; j++) {
        const result = chunk[j];
        const importKey = importKeysInChunk[j];
        if (existingByImportKey.has(importKey)) {
          toUpdate.push({ result, importKey });
        } else {
          toCreate.push({ result, importKey });
        }
      }

      // Batch updates
      for (const { result, importKey } of toUpdate) {
        const { name, category, priceFils, ...rest } = result.data;
        try {
          await prisma.product.update({
            where: { vendorId_importKey: { vendorId, importKey } },
            data: { name, category, priceFils, ...rest },
            // slug and importKey preserved
          });
          rowResults.push({
            rowNumber: result.rowIndex,
            sku: result.data.sku ?? null,
            name: result.data.name,
            status: "updated",
          });
        } catch (rowErr: unknown) {
          const msg = (rowErr as Error).message || "Database write failed";
          console.error(`[PRODUCT_IMPORT_ERROR] requestId=${requestId} row=${result.rowIndex} errMessage=${msg}`);
          rowResults.push({
            rowNumber: result.rowIndex,
            sku: result.data.sku ?? null,
            name: result.data.name,
            status: "failed",
            reason: msg,
          });
          rowErrors.push({
            rowNumber: result.rowIndex,
            sku: result.data.sku ?? null,
            name: result.data.name ?? null,
            message: msg,
          });
        }
      }

      // Batch creates using createMany with skipDuplicates (idempotent)
      if (toCreate.length > 0) {
        // Individual creates with row-level tracking
        for (const { result, importKey } of toCreate) {
          const { name, category, priceFils, ...rest } = result.data;
          try {
            await createProductWithSlugRetry({ vendorId, importKey, name, category, priceFils, ...rest });
            rowResults.push({
              rowNumber: result.rowIndex,
              sku: result.data.sku ?? null,
              name: result.data.name,
              status: "created",
            });
          } catch (rowErr: unknown) {
            const prismaErr = rowErr as { code?: string; meta?: { target?: string[] } };
            let msg = (rowErr as Error).message || "Database write failed";
            let status: "skipped" | "failed" = "failed";
            
            // P2002 = unique constraint violation (duplicate)
            if (prismaErr.code === "P2002") {
              const target = prismaErr.meta?.target?.join(", ") || "unknown field";
              msg = `Duplicate ${target} conflict`;
              status = "skipped";
            }
            
            console.error(`[PRODUCT_IMPORT_ERROR] requestId=${requestId} row=${result.rowIndex} status=${status} errMessage=${msg}`);
            rowResults.push({
              rowNumber: result.rowIndex,
              sku: result.data.sku ?? null,
              name: result.data.name,
              status,
              reason: msg,
            });
            
            if (status === "failed") {
              rowErrors.push({
                rowNumber: result.rowIndex,
                sku: result.data.sku ?? null,
                name: result.data.name ?? null,
                message: msg,
              });
            }
          }
        }
      }

      console.log(
        `[PRODUCT_IMPORT_CHUNK] requestId=${requestId} noSkuChunk=${ci + 1}/${totalChunks} rows=${chunk.length} updates=${toUpdate.length} creates=${toCreate.length} elapsed=${Date.now() - chunkStart}ms`,
      );
    }

    // Revalidate marketplace
    revalidatePath("/marketplace", "layout");
    revalidatePath("/vendor/products", "page");

  // Compute final counts from rowResults
  const created = rowResults.filter((r) => r.status === "created").length;
  const updated = rowResults.filter((r) => r.status === "updated").length;
  const skipped = rowResults.filter((r) => r.status === "skipped").length;
  const failed = rowResults.filter((r) => r.status === "failed").length;
  const attempted = rowResults.length;

    const totalMs = Date.now() - importStart;
    console.log(
      `[PRODUCT_IMPORT] requestId=${requestId} attempted=${attempted} created=${created} updated=${updated} skipped=${skipped} failed=${failed} totalMs=${totalMs}`,
    );

    return NextResponse.json({
      ok: true,
      requestId,
      attempted,
      created,
      updated,
      skipped,
      failed,
      rowResults,
      rowErrors,
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

/** Create a product with retry on slug collision (P2002 unique constraint).
 *  Tries base slug, then base-2, base-3, ..., base-{MAX_SLUG_RETRIES}. */
async function createProductWithSlugRetry(
  data: Omit<Prisma.ProductUncheckedCreateInput, "slug">,
): Promise<void> {
  const base = slugify(data.name);
  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      await prisma.product.create({ data: { ...data, slug } });
      return;
    } catch (err: unknown) {
      const prismaErr = err as { code?: string; meta?: { target?: string[] } };
      // P2002 = unique constraint violation — only retry if it's the slug field
      if (prismaErr.code === "P2002" && prismaErr.meta?.target?.includes("slug")) {
        continue;
      }
      throw err; // Non-slug error — propagate immediately
    }
  }
  // Exhausted retries — use timestamp suffix as final fallback
  const slug = `${base}-${Date.now().toString(36)}`;
  await prisma.product.create({ data: { ...data, slug } });
}
