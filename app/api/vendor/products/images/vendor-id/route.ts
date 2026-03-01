import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";

/**
 * GET /api/vendor/products/images/vendor-id
 *
 * Returns authenticated vendor's ID for blob path construction
 * This is a TINY JSON response - no sensitive data
 */
export async function GET() {
  try {
    const { vendorId } = await requireVendor();

    return NextResponse.json({ vendorId });
  } catch (error: any) {
    console.error("[VENDOR_ID] Error:", error);

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

    return NextResponse.json(
      { error: "Failed to get vendor ID" },
      { status: 500 }
    );
  }
}
