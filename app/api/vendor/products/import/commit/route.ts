import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { parseProductCsv } from "@/lib/csv-parser";
import { validateProductRow } from "@/lib/import-validator";
import { slugify } from "@/lib/slugify";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BATCH_SIZE = 50;

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

    // Re-validate (never trust client)
    const rows = await parseProductCsv(file);
    const results = await Promise.all(
      rows.map((row, i) =>
        validateProductRow(row, i + 1, vendor.allowedCategories, vendorId),
      ),
    );

    const validResults = results.filter((r) => r.isValid);
    const invalidResults = results.filter((r) => !r.isValid);

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

    // Process valid rows in batches
    const chunks: typeof validResults[] = [];
    for (let i = 0; i < validResults.length; i += BATCH_SIZE) {
      chunks.push(validResults.slice(i, i + BATCH_SIZE));
    }

    for (const chunk of chunks) {
      await prisma.$transaction(async (tx) => {
        for (const result of chunk) {
          const { sku, name, category, priceFils, ...rest } = result.data;

          try {
            if (sku) {
              // Upsert by (vendorId, sku)
              const existing = await tx.product.findUnique({
                where: { vendorId_sku: { vendorId, sku } },
                select: { id: true },
              });

              if (existing) {
                await tx.product.update({
                  where: { id: existing.id },
                  data: { name, category, priceFils, ...rest },
                });
                updated++;
              } else {
                const slug = await generateUniqueSlug(tx, name);
                await tx.product.create({
                  data: { vendorId, sku, name, slug, category, priceFils, ...rest },
                });
                created++;
              }
            } else {
              // No SKU — create only
              const slug = await generateUniqueSlug(tx, name);
              await tx.product.create({
                data: { vendorId, name, slug, category, priceFils, ...rest },
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
      });
    }

    // Revalidate marketplace
    revalidatePath("/marketplace", "layout");
    revalidatePath("/vendor/products", "page");

    console.log(
      `[PRODUCT_IMPORT] requestId=${requestId} created=${created} updated=${updated} failed=${failed}`,
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

async function generateUniqueSlug(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  name: string,
): Promise<string> {
  const base = slugify(name);
  const existing = await tx.product.findUnique({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${Date.now().toString(36)}`;
}
