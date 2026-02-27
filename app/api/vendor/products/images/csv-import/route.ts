import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { validateImageUrl } from "@/lib/validation/image-validation";

interface CsvRow {
  sku: string;
  imageUrl: string;
}

/**
 * POST /api/vendor/products/images/csv-import
 *
 * Import product images via CSV with URLs
 * CSV format: sku,imageUrl
 *
 * - Validates all URLs are HTTPS
 * - Vendor-scoped: only updates vendor's own products
 * - Supports clearing images (empty imageUrl with confirmation)
 */
export async function POST(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    const body = await req.json();
    const { rows, allowClear = false } = body as {
      rows: CsvRow[];
      allowClear?: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    if (rows.length > 1000) {
      return NextResponse.json(
        { error: "Too many rows. Maximum: 1000" },
        { status: 400 }
      );
    }

    // Validate and process each row
    const results: Array<{
      rowIndex: number;
      sku: string;
      imageUrl: string;
      success: boolean;
      action?: "updated" | "cleared" | "skipped";
      error?: string;
    }> = [];

    // Track duplicate SKUs
    const seenSkus = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1; // 1-based for user display

      // Validate row structure
      if (!row.sku || typeof row.sku !== "string") {
        results.push({
          rowIndex,
          sku: "",
          imageUrl: row.imageUrl || "",
          success: false,
          error: "SKU is required",
        });
        continue;
      }

      const sku = row.sku.trim();
      const imageUrl = row.imageUrl?.trim() || "";

      // Track duplicate SKUs
      if (seenSkus.has(sku)) {
        const firstRow = seenSkus.get(sku)!;
        results.push({
          rowIndex,
          sku,
          imageUrl,
          success: false,
          error: `Duplicate SKU (first seen in row ${firstRow}). Last row wins.`,
        });
        // Don't continue - we'll process this row, but warn user
      }
      seenSkus.set(sku, rowIndex);

      // Handle empty imageUrl (clearing)
      if (!imageUrl) {
        if (!allowClear) {
          results.push({
            rowIndex,
            sku,
            imageUrl: "",
            success: false,
            error: "Empty imageUrl. Enable 'Allow clearing images' to clear.",
          });
          continue;
        }

        // Clear the image
        try {
          const product = await prisma.product.findUnique({
            where: {
              vendorId_sku: {
                vendorId,
                sku,
              },
            },
          });

          if (!product) {
            results.push({
              rowIndex,
              sku,
              imageUrl: "",
              success: false,
              error: `Product not found for SKU: ${sku}`,
            });
            continue;
          }

          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: null },
          });

          results.push({
            rowIndex,
            sku,
            imageUrl: "",
            success: true,
            action: "cleared",
          });
        } catch (error) {
          results.push({
            rowIndex,
            sku,
            imageUrl: "",
            success: false,
            error: error instanceof Error ? error.message : "Failed to clear image",
          });
        }
        continue;
      }

      // Validate URL
      const validation = validateImageUrl(imageUrl);
      if (!validation.valid) {
        results.push({
          rowIndex,
          sku,
          imageUrl,
          success: false,
          error: validation.error,
        });
        continue;
      }

      // Find product and update
      try {
        const product = await prisma.product.findUnique({
          where: {
            vendorId_sku: {
              vendorId,
              sku,
            },
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (!product) {
          results.push({
            rowIndex,
            sku,
            imageUrl,
            success: false,
            error: `Product not found for SKU: ${sku}`,
          });
          continue;
        }

        // Update imageUrl
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl },
        });

        results.push({
          rowIndex,
          sku,
          imageUrl,
          success: true,
          action: "updated",
        });
      } catch (error) {
        results.push({
          rowIndex,
          sku,
          imageUrl,
          success: false,
          error: error instanceof Error ? error.message : "Failed to update",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const clearedCount = results.filter((r) => r.action === "cleared").length;
    const updatedCount = results.filter((r) => r.action === "updated").length;

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      successCount,
      failureCount,
      updatedCount,
      clearedCount,
      results,
    });
  } catch (error: any) {
    console.error("[CSV_IMPORT] Error:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Forbidden - No vendor account" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to import images", details: error.message },
      { status: 500 }
    );
  }
}
