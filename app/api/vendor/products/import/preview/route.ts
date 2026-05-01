import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { parseProductCsv } from "@/lib/csv-parser";
import { validateProductRow } from "@/lib/import-validator";
import { isValidCategorySlug, formatAllowedCategories } from "@/lib/utils/category";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMPORT_SCHEMA_VERSION = 1;

/** Deterministic hash for TOCTOU protection between preview and commit */
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
      // REMOVED: vendor.allowedCategories restriction
      // Vendors/admins can now use any valid category slug
    }

    const fileBuffer = await file.arrayBuffer();
    const fileContentHash = crypto.createHash("sha256").update(Buffer.from(fileBuffer)).digest("hex");

    // Re-create File-like object for parser (arrayBuffer already consumed)
    const fileBlob = new File([fileBuffer], file.name, { type: file.type });
    const rows = await parseProductCsv(fileBlob);

    const results = await Promise.all(
      rows.map((row, i) =>
        validateProductRow(row, i + 1, vendor.allowedCategories, vendorId, bulkCategory || undefined),
      ),
    );

    const validCount = results.filter((r) => r.isValid).length;
    const invalidCount = results.filter((r) => !r.isValid).length;
    const willCreate = results.filter((r) => r.isValid && r.action === "create").length;
    const willUpdate = results.filter((r) => r.isValid && r.action === "update").length;
    const missingCategoryCount = results.filter((r) => r.missingCategory).length;

    // Detect duplicate slugs within CSV
    const slugCounts = new Map<string, number[]>();
    const skuCounts = new Map<string, number[]>();
    
    for (const result of results) {
      if (result.computedSlug) {
        const rows = slugCounts.get(result.computedSlug) || [];
        rows.push(result.rowIndex);
        slugCounts.set(result.computedSlug, rows);
      }
      if (result.data.sku) {
        const rows = skuCounts.get(result.data.sku) || [];
        rows.push(result.rowIndex);
        skuCounts.set(result.data.sku, rows);
      }
    }

    // Mark duplicate slugs with warnings
    for (const [slug, rowIndexes] of slugCounts.entries()) {
      if (rowIndexes.length > 1) {
        for (const result of results) {
          if (result.computedSlug === slug) {
            result.warnings.push(`Duplicate slug "${slug}" in rows: ${rowIndexes.join(", ")}`);
          }
        }
      }
    }

    // Mark duplicate SKUs with warnings
    for (const [sku, rowIndexes] of skuCounts.entries()) {
      if (rowIndexes.length > 1) {
        for (const result of results) {
          if (result.data.sku === sku) {
            result.warnings.push(`Duplicate SKU "${sku}" in rows: ${rowIndexes.join(", ")}`);
          }
        }
      }
    }

    // Check for existing slugs in DB (batch query)
    const allSlugs = Array.from(slugCounts.keys());
    if (allSlugs.length > 0) {
      const existingProducts = await prisma.product.findMany({
        where: { slug: { in: allSlugs } },
        select: { slug: true, name: true, vendorId: true },
      });
      const existingSlugMap = new Map(existingProducts.map((p) => [p.slug, p]));
      
      for (const result of results) {
        if (result.computedSlug && existingSlugMap.has(result.computedSlug)) {
          const existing = existingSlugMap.get(result.computedSlug)!;
          const isSameVendor = existing.vendorId === vendorId;
          result.warnings.push(
            `Slug "${result.computedSlug}" already exists${isSameVendor ? " in your products" : " (another vendor)"}: "${existing.name}"`
          );
        }
      }
    }

    const previewId = computePreviewId(fileContentHash, vendorId, vendor.allowedCategories, bulkCategory);

    return NextResponse.json({
      ok: true,
      requestId,
      previewId,
      allowedCategories: vendor.allowedCategories,
      preview: {
        totalRows: rows.length,
        validRows: validCount,
        invalidRows: invalidCount,
        missingCategoryCount,
        counts: { willCreate, willUpdate },
        rows: results.map((r) => ({
          rowIndex: r.rowIndex,
          isValid: r.isValid,
          errors: r.errors,
                    warnings: r.warnings,
          action: r.action,
          rawCategory: r.rawCategory,
          mappedCategorySlug: r.mappedCategorySlug,
          mappingReason: r.mappingReason,
          mappingConfidence: r.mappingConfidence,
          missingCategory: r.missingCategory,
                    peptideSubtype: r.peptideSubtype,
                    computedSlug: r.computedSlug,
          data: {
            sku: r.data.sku,
            name: r.data.name,
            category: r.data.category,
            priceFils: r.data.priceFils,
          },
        })),
      },
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
      { ok: false, code: "INTERNAL_ERROR", requestId, message: err.message || "Preview failed" },
      { status: 500 },
    );
  }
}
