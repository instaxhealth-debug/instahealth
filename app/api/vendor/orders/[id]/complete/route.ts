import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/requireVendor";
import { transitionVendorOrder, VendorOrderTransitionError } from "@/lib/fulfillment/vendor-order-machine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorOrderId = params.id;
    const { vendorId } = await requireVendor();

    const result = await transitionVendorOrder({
      vendorOrderId,
      targetStatus: "COMPLETED",
      actorType: "VENDOR",
      actorId: vendorId,
      vendorId,
    });

    return NextResponse.json({
      success: true,
      already: result.already,
      vendorOrder: {
        id: vendorOrderId,
        status: "COMPLETED",
        fulfilledAt: result.vendorOrder?.fulfilledAt,
      },
    });
  } catch (error: any) {
    console.error("[VENDOR_ORDER_COMPLETE] Error:", error);
    if (error instanceof VendorOrderTransitionError) {
      if (error.code === "NOT_FOUND" || error.code === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Vendor order not found" }, { status: 404 });
      }
      if (error.code === "INVALID_TRANSITION" || error.code === "INVALID_DATA" || error.code === "CONFLICT") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden - user is not a vendor" }, { status: 403 });
      }
    }

    return NextResponse.json({ error: "Failed to complete order" }, { status: 500 });
  }
}
