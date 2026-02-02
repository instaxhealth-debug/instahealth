/**
 * GET /api/vendor/orders/[id]/details
 * 
 * Get full details of a vendor order including event history.
 * Vendor ID comes from authenticated session ONLY.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorOrderEventHistory } from '@/lib/fulfillment/order-events';
import { requireVendor } from '@/lib/auth/requireVendor';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorOrderId = params.id;

    const { vendorId } = await requireVendor();

    // Get vendor order with full details
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            shippingName: true,
            shippingPhone: true,
            shippingAddressLine1: true,
            shippingAddressLine2: true,
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
      return NextResponse.json(
        { error: 'Vendor order not found' },
        { status: 404 }
      );
    }

    // Verify vendor owns this order
    if (vendorOrder.vendorId !== vendorId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get event history
    const events = await getVendorOrderEventHistory(vendorOrderId);

    // Format response
    const now = new Date();
    const timeUntilExpiry = vendorOrder.acceptBy.getTime() - now.getTime();
    const isExpired = timeUntilExpiry < 0;
    const minutesRemaining = Math.ceil(timeUntilExpiry / (1000 * 60));

    return NextResponse.json({
      success: true,
      vendorOrder: {
        id: vendorOrder.id,
        status: vendorOrder.status,
        createdAt: vendorOrder.createdAt,
        updatedAt: vendorOrder.updatedAt,
        acceptBy: vendorOrder.acceptBy,
        acceptedAt: vendorOrder.acceptedAt,
        rejectedAt: vendorOrder.rejectedAt,
        fulfilledAt: vendorOrder.fulfilledAt,
        cancelledAt: vendorOrder.cancelledAt,
        isExpired,
        minutesRemaining: isExpired ? 0 : minutesRemaining,
        notes: {
          toVendor: vendorOrder.notesToVendor,
          internal: vendorOrder.notesInternal,
        },
        order: {
          id: vendorOrder.order.id,
          status: vendorOrder.order.status,
          createdAt: vendorOrder.order.createdAt,
          customer: {
            name: vendorOrder.order.shippingName,
            phone: vendorOrder.order.shippingPhone,
          },
          address: {
            line1: vendorOrder.order.shippingAddressLine1,
            line2: vendorOrder.order.shippingAddressLine2,
          },
          deliveryNotes: vendorOrder.order.shippingNotes,
          amount: {
            fils: vendorOrder.order.totalFils,
            aed: (vendorOrder.order.totalFils / 100).toFixed(2),
          },
        },
        items: vendorOrder.items.map((item) => ({
          id: item.orderItem.id,
          productName: item.orderItem.productName,
          variantSku: item.orderItem.variantSku,
          quantity: item.orderItem.quantity,
          unitPriceFils: item.orderItem.unitPriceFils,
          lineTotalFils: item.orderItem.lineTotalFils,
          lineAED: (item.orderItem.lineTotalFils / 100).toFixed(2),
        })),
        itemCount: vendorOrder.items.length,
      },
      eventHistory: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        actorType: e.actorType,
        actorId: e.actorId,
        data: e.data,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error('[API] Get vendor order details failed:', error);
    
    // Handle auth errors
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden - user is not a vendor' }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get vendor order details',
      },
      { status: 400 }
    );
  }
}
