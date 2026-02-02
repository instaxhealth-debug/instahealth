/**
 * POST /api/vendor/orders/[id]/cancel
 * 
 * Vendor cancels their order AFTER accepting (e.g., cannot fulfill).
 * Different from REJECTED which is before accepting.
 * Triggers a refund since order was already accepted.
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
    const { reason } = body;

    const { vendorId, userId } = await requireVendor();

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
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

    // Can only cancel if ACCEPTED or PREPARING
    // Cannot cancel PENDING_ACCEPTANCE (use reject instead)
    // Cannot cancel already DELIVERED or CANCELLED_BY_VENDOR
    if (!['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(vendorOrder.status)) {
      return NextResponse.json(
        {
          error: `Cannot cancel order in status: ${vendorOrder.status}. Use reject endpoint for PENDING_ACCEPTANCE orders.`,
        },
        { status: 409 }
      );
    }

    // UPDATE with WHERE guard
    const updated = await prisma.vendorOrder.updateMany({
      where: {
        id: vendorOrderId,
        status: {
          in: ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'],
        },
      },
      data: {
        status: 'CANCELLED_BY_VENDOR',
        cancelledAt: new Date(),
        notesInternal: `Cancelled by vendor: ${reason}`,
        terminalReason: 'VENDOR_CANCELLED',
        resolutionNotes: `Vendor cancelled after accepting. Reason: ${reason}`,
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
    // MVP: Always refund for cancelled-after-accept
    try {
      await issueVendorOrderRefund({
        orderId: vendorOrder.orderId,
        vendorOrderId,
        amountFils: refundAmount,
        reason: `Vendor cancelled after accept: ${reason}`,
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

    // Log cancellation event
    await logOrderEvent({
      vendorOrderId,
      orderId: vendorOrder.orderId,
      actorType: ActorType.VENDOR,
      actorId: vendorId,
      eventType: 'VENDOR_CANCELLED_AFTER_ACCEPT',
      data: {
        vendorName: vendorOrder.vendor.name,
        itemCount: vendorOrder.items.length,
        reason,
        previousStatus: vendorOrder.status,
        cancelledAt: new Date().toISOString(),
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
        message: 'Order cancelled by vendor and refund initiated',
        vendorOrder: {
          id: vendorOrderId,
          status: 'CANCELLED_BY_VENDOR',
          cancelledAt: new Date().toISOString(),
          itemCount: vendorOrder.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[vendor/cancel] Error:', error);
    
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
