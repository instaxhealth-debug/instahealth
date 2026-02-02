/**
 * POST /api/vendor/orders/[id]/accept
 * 
 * Vendor accepts a pending order.
 * CONCURRENCY SAFE: Uses WHERE guard to prevent race conditions
 * IDEMPOTENT at database level: If 0 rows updated, order was already processed
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logOrderEvent } from '@/lib/fulfillment/order-events';
import { ActorType } from '@prisma/client';
import { checkAndUpdateParentOrderStatus } from '@/lib/fulfillment/parent-status';
import { requireVendor } from '@/lib/auth/requireVendor';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorOrderId = params.id;

    const { vendorId, userId } = await requireVendor();

    // Fetch order with guard conditions
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        items: true,
        vendor: true,
      },
    });

    if (!vendorOrder) {
      return NextResponse.json(
        { error: 'Vendor order not found' },
        { status: 404 }
      );
    }

    // Verify vendor ownership
    if (vendorOrder.vendorId !== vendorId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check deadline manually first (before update attempt)
    if (vendorOrder.acceptBy < new Date()) {
      return NextResponse.json(
        { error: 'Acceptance deadline passed' },
        { status: 409 }
      );
    }

    // Check if already accepted
    if (vendorOrder.status !== 'PENDING_ACCEPTANCE') {
      return NextResponse.json(
        { error: `Cannot accept order in status: ${vendorOrder.status}` },
        { status: 409 }
      );
    }

    // UPDATE with WHERE guard - ensures only PENDING_ACCEPTANCE orders before deadline are updated
    // This is the concurrency-safe operation
    const updated = await prisma.vendorOrder.updateMany({
      where: {
        id: vendorOrderId,
        status: 'PENDING_ACCEPTANCE',
        acceptBy: {
          gt: new Date(), // Guard: only update if deadline not passed
        },
      },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // If 0 rows updated, another process updated it (race lost)
    // or deadline has passed (SLA enforcement)
    if (updated.count === 0) {
      return NextResponse.json(
        { error: 'Order was already processed or deadline passed' },
        { status: 409 }
      );
    }

    // Log acceptance event
    await logOrderEvent({
      vendorOrderId,
      orderId: vendorOrder.orderId,
      actorType: ActorType.VENDOR,
      actorId: vendorId,
      eventType: 'VENDOR_ACCEPTED',
      data: {
        vendorName: vendorOrder.vendor.name,
        itemCount: vendorOrder.items.length,
        acceptedAt: new Date().toISOString(),
      },
    });

    // Try to update parent order status
    try {
      await checkAndUpdateParentOrderStatus(vendorOrder.orderId);
    } catch (e) {
      console.error('Failed to update parent order status:', e);
      // Don't fail the request - acceptance succeeded
    }

    // Return updated vendor order
    const updated_vo = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        items: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        vendorOrder: {
          id: updated_vo?.id,
          status: updated_vo?.status,
          acceptedAt: updated_vo?.acceptedAt,
          itemCount: updated_vo?.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[vendor/accept] Error:', error);
    
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
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
