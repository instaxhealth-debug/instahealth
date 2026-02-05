/**
 * POST /api/vendor/orders/[id]/update-status
 * 
 * Vendor updates fulfillment status:
 * READY_FOR_FULFILLMENT → ACCEPTED → IN_PROGRESS → COMPLETED
 *
 * CONCURRENCY SAFE: Uses WHERE guard to validate transitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logOrderEvent } from '@/lib/fulfillment/order-events';
import { ActorType } from '@prisma/client';
import { checkAndUpdateParentOrderStatus } from '@/lib/fulfillment/parent-status';
import { requireVendor } from '@/lib/auth/requireVendor';

const VALID_TRANSITIONS: Record<string, string[]> = {
  READY_FOR_FULFILLMENT: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorOrderId = params.id;
    const body = await req.json();
    const { newStatus } = body;

    const { vendorId, userId } = await requireVendor();

    if (!newStatus) {
      return NextResponse.json(
        { error: 'New status is required' },
        { status: 400 }
      );
    }

    // Fetch vendor order
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

    // Validate status transition
    const allowedTransitions = VALID_TRANSITIONS[vendorOrder.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${vendorOrder.status} to ${newStatus}. Allowed: ${
            allowedTransitions?.join(', ') || 'none'
          }`,
        },
        { status: 409 }
      );
    }

    // UPDATE with WHERE guard to ensure transition is valid
    // This is concurrency-safe: only updates if current status matches expected
    const updated = await prisma.vendorOrder.updateMany({
      where: {
        id: vendorOrderId,
        status: vendorOrder.status, // Guard: must still be in current status
      },
      data: {
        status: newStatus,
        ...(newStatus === 'COMPLETED' && { fulfilledAt: new Date() }),
      },
    });

    // If 0 rows updated, another process already updated it
    if (updated.count === 0) {
      return NextResponse.json(
        { error: 'Order was already processed' },
        { status: 409 }
      );
    }

    // Log status change event
    await logOrderEvent({
      vendorOrderId,
      orderId: vendorOrder.orderId,
      actorType: ActorType.VENDOR,
      actorId: vendorId,
      eventType: 'VENDOR_STATUS_CHANGED',
      data: {
        vendorName: vendorOrder.vendor.name,
        from: vendorOrder.status,
        to: newStatus,
        itemCount: vendorOrder.items.length,
        timestamp: new Date().toISOString(),
      },
    });

    // If completed, try to update parent order status
    if (newStatus === 'COMPLETED') {
      try {
        await checkAndUpdateParentOrderStatus(vendorOrder.orderId);
      } catch (e) {
        console.error('Failed to update parent order status:', e);
      }
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
          updatedAt: updated_vo?.updatedAt,
          fulfilledAt: updated_vo?.fulfilledAt,
          itemCount: updated_vo?.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[vendor/update-status] Error:', error);
    
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
