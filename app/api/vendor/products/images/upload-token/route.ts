import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

/**
 * POST /api/vendor/products/images/upload-token
 *
 * Generate a client upload token for direct-to-Vercel-Blob uploads
 * This avoids sending large files through the API route (serverless limits)
 *
 * Client will:
 * 1. Request token from this endpoint
 * 2. Upload directly to Vercel Blob
 * 3. Call /update-images with the returned blob URLs
 */
export async function POST(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    const body = (await req.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file path format
        if (!pathname.startsWith(`vendors/${vendorId}/products/`)) {
          throw new Error("Invalid upload path");
        }

        // Return metadata that will be attached to the blob
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Optional: log successful uploads
        console.log("[UPLOAD_TOKEN] Blob uploaded:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("[UPLOAD_TOKEN] Error:", error);

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
      { error: "Failed to generate upload token", details: error.message },
      { status: 500 }
    );
  }
}
