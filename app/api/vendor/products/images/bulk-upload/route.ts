import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { validateImageBatch, extractSkuFromFilename } from "@/lib/validation/image-validation";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/vendor/products/images/bulk-upload
 *
 * Upload multiple images and assign to products by SKU
 * Supports two mapping modes:
 * 1. filename = SKU (e.g., "ABC123.jpg" → sku: "ABC123")
 * 2. CSV mapping (future: send mapping in request body)
 */
export async function POST(req: NextRequest) {
  try {
    // Check for BLOB_READ_WRITE_TOKEN
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[BULK_UPLOAD] BLOB_READ_WRITE_TOKEN is missing");
      return NextResponse.json(
        { error: "Server configuration error: BLOB_READ_WRITE_TOKEN missing" },
        { status: 500 }
      );
    }

    const { vendorId } = await requireVendor();

    // Parse multipart form data
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const mappingMode = (formData.get("mappingMode") as string) || "filename";
    const replaceExisting = formData.get("replaceExisting") === "true";

    // Get CSV mapping if provided
    let csvMapping: Map<string, string> | null = null;
    if (mappingMode === "csv") {
      const mappingJson = formData.get("mapping") as string;
      if (mappingJson) {
        try {
          const mappingArray = JSON.parse(mappingJson) as Array<{
            sku: string;
            filename: string;
          }>;
          csvMapping = new Map(
            mappingArray.map((m) => [m.filename, m.sku])
          );
        } catch {
          return NextResponse.json(
            { error: "Invalid CSV mapping JSON" },
            { status: 400 }
          );
        }
      }
    }

    // Validate files
    const validation = validateImageBatch(files);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "File validation failed",
          details: validation.errors,
          invalidFiles: validation.invalidFiles.map((f) => ({
            filename: f.file.name,
            error: f.error,
          })),
        },
        { status: 400 }
      );
    }

    // Process each file
    const results: Array<{
      filename: string;
      sku: string;
      success: boolean;
      imageUrl?: string;
      error?: string;
    }> = [];

    for (const file of validation.validFiles) {
      let sku = "";
      try {
        // Determine SKU based on mapping mode
        if (mappingMode === "csv" && csvMapping) {
          const mappedSku = csvMapping.get(file.name);
          if (!mappedSku) {
            results.push({
              filename: file.name,
              sku: "",
              success: false,
              error: "SKU not found in CSV mapping",
            });
            continue;
          }
          sku = mappedSku;
        } else {
          // filename mode: extract SKU from filename
          sku = extractSkuFromFilename(file.name);
        }

        // Find product by vendor-scoped SKU
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
            imageUrl: true,
          },
        });

        if (!product) {
          results.push({
            filename: file.name,
            sku,
            success: false,
            error: `Product not found for SKU: ${sku}`,
          });
          continue;
        }

        // Check if image already exists
        if (product.imageUrl && !replaceExisting) {
          results.push({
            filename: file.name,
            sku,
            success: false,
            error: `Product already has an image. Enable "Replace existing" to overwrite.`,
          });
          continue;
        }

        // Upload to Vercel Blob
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Construct blob path: vendors/{vendorId}/products/{sku}.{ext}
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const blobPath = `vendors/${vendorId}/products/${sku}.${ext}`;

        const blob = await put(blobPath, buffer, {
          access: "public",
          contentType: file.type,
        });

        // Update product imageUrl
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: blob.url },
        });

        results.push({
          filename: file.name,
          sku,
          success: true,
          imageUrl: blob.url,
        });
      } catch (error) {
        console.error(`[BULK_UPLOAD] Error processing ${file.name}:`, error);
        results.push({
          filename: file.name,
          sku: sku || extractSkuFromFilename(file.name),
          success: false,
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      validFiles: validation.validFiles.length,
      invalidFiles: validation.invalidFiles.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error: any) {
    console.error("[BULK_UPLOAD] Error:", error);

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
      { error: "Failed to upload images", details: error.message },
      { status: 500 }
    );
  }
}
