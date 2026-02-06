import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { logOrderEvent } from '@/lib/fulfillment/order-events';

/**
 * GET /api/admin/vendor-orders/[id]/impersonate
 * Admin-only: view vendor order details for debugging.
 * Logs OrderEvent with actorType ADMIN.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const vendorOrderId = params.id;

    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        vendor: { select: { id: true, name: true, email: true } },
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
            updatedAt: true,
          },
        },
        items: {
          include: {
            orderItem: {
              select: {
                id: true,
                productName: true,
                variantSku: true,
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
      return NextResponse.json({ error: 'Vendor order not found' }, { status: 404 });
    }

    await logOrderEvent({
      orderId: vendorOrder.orderId,
      vendorOrderId: vendorOrder.id,
      actorType: 'ADMIN',
      actorId: session.user?.id,
      eventType: 'ADMIN_IMPERSONATE_VENDOR_ORDER_VIEW',
      data: {
        adminEmail: session.user?.email,
        vendorId: vendorOrder.vendorId,
        vendorName: vendorOrder.vendor?.name,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      vendorOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch vendor order' },
      { status: 400 }
    );
  }
}