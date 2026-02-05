/**
 * POST /api/vendor/orders/[id]/reject
 * 
 * Vendor rejects their order portion ONLY before accepting.
 * After ACCEPTED, vendor must use /cancel endpoint instead.
 *
 * CONCURRENCY SAFE: Uses WHERE guard
 * REFUND IDEMPOTENT: Refund table ensures no double-refunds
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { issueVendorOrderRefund } from '@/lib/payments/refunds';
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
    const body = await req.json();
    const { rejectionReason } = body;

    const { vendorId, userId } = await requireVendor();

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Fetch vendor order
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        vendor: true,
        order: true,
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

    // HARD RULE: Can only reject if READY_FOR_FULFILLMENT
    // After ACCEPTED, must use /cancel endpoint
    if (vendorOrder.status !== 'READY_FOR_FULFILLMENT') {
      return NextResponse.json(
        {
          error: `Cannot reject order in status: ${vendorOrder.status}. Use cancel endpoint if order is ACCEPTED.`,
        },
        { status: 409 }
      );
    }

    // UPDATE with WHERE guard
    const updated = await prisma.vendorOrder.updateMany({
      where: {
        id: vendorOrderId,
        status: 'READY_FOR_FULFILLMENT',
      },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        notesInternal: `Rejected by vendor: ${rejectionReason}`,
        terminalReason: 'VENDOR_REJECTED',
        resolutionNotes: `Vendor rejected before accepting. Reason: ${rejectionReason}`,
      },
    });

    // If 0 rows updated, another process already updated it
    if (updated.count === 0) {
      return NextResponse.json(
        { error: 'Order was already processed' },
        { status: 409 }
      );
    }

    // Calculate refund amount
    const refundAmount = vendorOrder.items.reduce(
      (sum, item) => sum + item.orderItem.lineTotalFils,
      0
    );

    // Issue refund (idempotent via Refund table unique constraint)
    try {
      await issueVendorOrderRefund({
        orderId: vendorOrder.orderId,
        vendorOrderId,
        amountFils: refundAmount,
        reason: `Vendor rejection: ${rejectionReason}`,
        actorType: ActorType.VENDOR,
        actorId: vendorId,
      });
    } catch (refundError) {
      console.error('Failed to issue refund:', refundError);
      // Log failure but continue
      await logOrderEvent({
        orderId: vendorOrder.orderId,
        vendorOrderId,
        actorType: ActorType.SYSTEM,
        eventType: 'REFUND_FAILED',
        data: {
          amountFils: refundAmount,
          reason: refundError instanceof Error ? refundError.message : 'Unknown error',
        },
      });
    }

    // Log rejection event
    await logOrderEvent({
      vendorOrderId,
      orderId: vendorOrder.orderId,
      actorType: ActorType.VENDOR,
      actorId: vendorId,
      eventType: 'VENDOR_REJECTED',
      data: {
        vendorName: vendorOrder.vendor.name,
        itemCount: vendorOrder.items.length,
        reason: rejectionReason,
        rejectedAt: new Date().toISOString(),
      },
    });

    // Update parent order status
    try {
      await checkAndUpdateParentOrderStatus(vendorOrder.orderId);
    } catch (e) {
      console.error('Failed to update parent order status:', e);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Order rejected and partial refund initiated',
        vendorOrder: {
          id: vendorOrderId,
          status: 'REJECTED',
          rejectedAt: new Date().toISOString(),
          itemCount: vendorOrder.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[vendor/reject] Error:', error);
    
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
