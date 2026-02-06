import { NextRequest, NextResponse } from "next/server";
import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { VendorOrderStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendor = await getVendorContext();
    const vendorOrderId = params.id;

    // Fetch and validate vendor order belongs to this vendor
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: { order: true },
    });

    if (!vendorOrder || vendorOrder.vendorId !== vendor.vendorId) {
      return NextResponse.json(
        { error: "Order not found or access denied" },
        { status: 404 }
      );
    }

    // Validate state transition - can only complete from ACCEPTED or IN_PROGRESS
    if (
      vendorOrder.status !== VendorOrderStatus.ACCEPTED &&
      vendorOrder.status !== VendorOrderStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        {
          error: `Cannot complete order with status ${vendorOrder.status}. Must be ACCEPTED or IN_PROGRESS.`,
        },
        { status: 400 }
      );
    }

    // Update vendor order to COMPLETED
    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: {
        status: VendorOrderStatus.COMPLETED,
        fulfilledAt: new Date(),
      },
    });

    // Log OrderEvent
    await prisma.orderEvent.create({
      data: {
        orderId: vendorOrder.orderId,
        vendorOrderId: vendorOrder.id,
        actorType: "VENDOR",
        actorId: vendor.userId,
        eventType: "VENDOR_FULFILLED",
        data: {
          vendorId: vendor.vendorId,
          vendorName: vendor.vendorName,
          previousStatus: vendorOrder.status,
          newStatus: VendorOrderStatus.COMPLETED,
        },
      },
    });

    console.log("[VENDOR_ORDER_COMPLETE] ✓ Order completed", {
      vendorOrderId,
      vendorId: vendor.vendorId,
      orderId: vendorOrder.orderId,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[VENDOR_ORDER_COMPLETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to complete order" },
      { status: 500 }
    );
  }
}
