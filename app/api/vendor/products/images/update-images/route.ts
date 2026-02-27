import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";

interface ImageUpdate {
  sku: string;
  blobUrl: string;
  filename: string;
}

interface UpdateResult {
  filename: string;
  sku: string;
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * POST /api/vendor/products/images/update-images
 *
 * Update product imageUrl fields after direct-to-Blob uploads
 * This is called after client uploads files to Vercel Blob
 *
 * Request body:
 * {
 *   "updates": [
 *     { "sku": "ABC123", "blobUrl": "https://...", "filename": "ABC123.jpg" }
 *   ],
 *   "replaceExisting": false
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    const body = await req.json();
    const { updates, replaceExisting = false } = body as {
      updates: ImageUpdate[];
      replaceExisting?: boolean;
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    if (updates.length > 100) {
      return NextResponse.json(
        { error: "Too many updates. Maximum: 100" },
        { status: 400 }
      );
    }

    const results: UpdateResult[] = [];

    for (const update of updates) {
      const { sku, blobUrl, filename } = update;

      if (!sku || !blobUrl || !filename) {
        results.push({
          filename: filename || "",
          sku: sku || "",
          success: false,
          error: "Missing required fields (sku, blobUrl, filename)",
        });
        continue;
      }

      // Validate blob URL is from Vercel Blob
      if (!blobUrl.includes("blob.vercel-storage.com")) {
        results.push({
          filename,
          sku,
          success: false,
          error: "Invalid blob URL - must be from Vercel Blob storage",
        });
        continue;
      }

      try {
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
            filename,
            sku,
            success: false,
            error: `Product not found for SKU: ${sku}`,
          });
          continue;
        }

        // Check if image already exists
        if (product.imageUrl && !replaceExisting) {
          results.push({
            filename,
            sku,
            success: false,
            error: `Product already has an image. Enable "Replace existing" to overwrite.`,
          });
          continue;
        }

        // Update product imageUrl
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: blobUrl },
        });

        results.push({
          filename,
          sku,
          success: true,
          imageUrl: blobUrl,
        });
      } catch (error) {
        console.error(`[UPDATE_IMAGES] Error updating ${sku}:`, error);
        results.push({
          filename,
          sku,
          success: false,
          error: error instanceof Error ? error.message : "Update failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      totalUpdates: updates.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error: any) {
    console.error("[UPDATE_IMAGES] Error:", error);

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
      { error: "Failed to update images", details: error.message },
      { status: 500 }
    );
  }
}
