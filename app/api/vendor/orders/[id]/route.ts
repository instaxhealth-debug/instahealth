import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVendor } from "@/lib/auth/requireVendor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/vendor/orders/[id]
 * Returns vendor-scoped order details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorOrderId = params.id;
    const { vendorId } = await requireVendor();

    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            shippingName: true,
            shippingPhone: true,
            shippingAddressLine1: true,
            shippingAddressLine2: true,
            shippingArea: true,
            shippingEmirate: true,
            shippingNotes: true,
            totalFils: true,
            createdAt: true,
          },
        },
        items: {
          include: {
            orderItem: {
              select: {
                id: true,
                productName: true,
                quantity: true,
                unitPriceFils: true,
                lineTotalFils: true,
              },
            },
          },
        },
      },
    });

    if (!vendorOrder) {
      return NextResponse.json({ error: "Vendor order not found" }, { status: 404 });
    }

    if (vendorOrder.vendorId !== vendorId) {
      return NextResponse.json({ error: "Vendor order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      vendorOrder,
    });
  } catch (error) {
    console.error("[API] Get vendor order failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor order" },
      { status: 500 }
    );
  }
}
