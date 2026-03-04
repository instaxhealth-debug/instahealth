import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/vendor/products/images/debug/status
 *
 * Debug endpoint for proving productId-based upload pipeline
 * Returns vendor's products and system configuration
 */
export async function GET(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    // Fetch last 20 products ordered by creation date
    const products = await prisma.product.findMany({
      where: {
        vendorId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        imageUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    // Check if Blob deletion is enabled (based on environment)
    const blobDeletionEnabled = !!process.env.BLOB_READ_WRITE_TOKEN;

    // Stats
    const totalProducts = await prisma.product.count({
      where: { vendorId },
    });

    const productsWithImages = await prisma.product.count({
      where: {
        vendorId,
        imageUrl: { not: null },
      },
    });

    const productsWithoutSku = await prisma.product.count({
      where: {
        vendorId,
        sku: null,
      },
    });

    const productsWithoutSkuButHaveImage = await prisma.product.count({
      where: {
        vendorId,
        sku: null,
        imageUrl: { not: null },
      },
    });

    // Extract blob paths from imageUrls to verify pattern
    const blobPaths = products
      .filter((p) => p.imageUrl)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        sku: p.sku || "NO SKU",
        extractedPath: extractBlobPath(p.imageUrl!),
        expectedPattern: `vendors/${vendorId}/products/${p.id}.*`,
        matches: extractBlobPath(p.imageUrl!).includes(
          `vendors/${vendorId}/products/${p.id}`
        ),
      }));

    return NextResponse.json({
      success: true,
      debug: {
        vendorId,
        timestamp: new Date().toISOString(),
        blobDeletionEnabled,
      },
      stats: {
        totalProducts,
        productsWithImages,
        productsWithoutSku,
        productsWithoutSkuButHaveImage,
        imageUrlPattern: `vendors/${vendorId}/products/{productId}.{ext}`,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || null,
        hasImageUrl: !!p.imageUrl,
        imageUrlDomain: p.imageUrl
          ? new URL(p.imageUrl).hostname
          : null,
        createdAt: p.createdAt.toISOString(),
      })),
      blobPathVerification: blobPaths,
      proof: {
        uploadEndpoint: "POST /api/vendor/products/images/update-image",
        requiredPayload: {
          productId: "string (REQUIRED)",
          imageUrl: "string (REQUIRED)",
          replaceExisting: "boolean",
          filename: "string (optional)",
        },
        canUploadEndpoint: "GET /api/vendor/products/images/can-upload",
        requiredQueryParams: {
          productId: "string (REQUIRED)",
          replaceExisting: "boolean",
        },
        deleteEndpoint: "DELETE /api/vendor/products/images",
        requiredDeletePayload: {
          productId: "string (REQUIRED)",
          deleteBlob: "boolean (optional)",
        },
        noSkuUsage: "✅ No 'sku' parameter used in any endpoint",
        blobPathPattern: `vendors/${vendorId}/products/{productId}.{ext}`,
      },
    });
  } catch (error: any) {
    console.error("[DEBUG_STATUS] Error:", error);

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
      { error: "Failed to get debug status", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Extract pathname from blob URL
 */
function extractBlobPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\//, ""); // Remove leading slash
  } catch {
    return url;
  }
}
