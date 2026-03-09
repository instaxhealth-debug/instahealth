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
      if (vendor.allowedCategories.length > 0 && !vendor.allowedCategories.includes(bulkCategory)) {
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", requestId, message: `Bulk category '${bulkCategory}' is not in your allowed categories. Allowed: ${formatAllowedCategories(vendor.allowedCategories)}` },
          { status: 400 },
        );
      }
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
          action: r.action,
          rawCategory: r.rawCategory,
          mappedCategorySlug: r.mappedCategorySlug,
          mappingReason: r.mappingReason,
          mappingConfidence: r.mappingConfidence,
          missingCategory: r.missingCategory,
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
