import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";

/**
 * POST /api/vendor/products/images/upload-token
 *
 * Secure upload token generation using handleUpload()
 * DOES NOT expose BLOB_READ_WRITE_TOKEN to the browser
 * Enforces vendor-scoped upload paths and file restrictions
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Verify vendor authentication BEFORE generating any token
    const { vendorId } = await requireVendor();

    // Parse request body for handleUpload
    const body = (await request.json()) as HandleUploadBody;

    // Parse client payload to get replaceExisting flag
    let replaceExisting = false;
    try {
      // body.payload can be string or complex object
      // If it's in the initial request, it will be clientPayload string
      const payload = body as any;
      if (payload.clientPayload && typeof payload.clientPayload === 'string') {
        const clientPayload = JSON.parse(payload.clientPayload);
        replaceExisting = clientPayload.replaceExisting === true;
      }
    } catch (e) {
      console.warn("[UPLOAD_TOKEN] Failed to parse clientPayload:", e);
    }

    console.log("[UPLOAD_TOKEN] Processing upload:", {
      vendorId,
      replaceExisting,
      hasPayload: !!body.payload,
    });

    // Use handleUpload to securely generate client upload token
    // Token is scoped to specific path/file restrictions
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        // CRITICAL SECURITY: Validate upload path is vendor-scoped
        const expectedPrefix = `vendors/${vendorId}/products/`;

        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error(
            `Unauthorized path. Must start with: ${expectedPrefix}`
          );
        }

        console.log("[UPLOAD_TOKEN] Generating token:", {
          vendorId,
          pathname,
          replaceExisting,
          allowOverwrite: replaceExisting,
          addRandomSuffix: false,
        });

        // Return token configuration with restrictions
        return {
          // Allowed content types (images only)
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          // Maximum file size: 5MB
          maximumSizeInBytes: 5 * 1024 * 1024,
          // Overwrite behavior based on replaceExisting flag
          allowOverwrite: replaceExisting,
          // NEVER add random suffix - prevent storage landfill
          // If replaceExisting=false and blob exists, upload will fail
          // This is intentional - client should check first
          addRandomSuffix: false,
          // Token metadata (will be passed back to client)
          tokenPayload: JSON.stringify({
            vendorId,
            uploadedAt: new Date().toISOString(),
            replaceExisting,
          }),
        };
      },
    });

    // Return the secure response from handleUpload
    // This contains a ONE-TIME token scoped to the specific upload
    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("[UPLOAD_TOKEN] Error:", error);

    // Handle authentication errors
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Forbidden - No vendor account" },
        { status: 403 }
      );
    }

    // Handle path validation errors
    if (error.message?.includes("Unauthorized path")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: "Failed to generate upload token", details: error.message },
      { status: 500 }
    );
  }
}
