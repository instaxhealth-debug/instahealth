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
import { issueVendorOrderRefund } from '@/lib/payments/refunds';
import { checkAndUpdateParentOrderStatus } from '@/lib/fulfillment/parent-status';
import { requireVendor } from '@/lib/auth/requireVendor';
import { transitionVendorOrder, VendorOrderTransitionError } from '@/lib/fulfillment/vendor-order-machine';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorOrderId = params.id;
    const body = await req.json();
    const reason = (body?.reason || '').trim();

    const { vendorId, userId } = await requireVendor();

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      );
    }

    const result = await transitionVendorOrder({
      vendorOrderId,
      targetStatus: 'CANCELLED',
      actorType: 'VENDOR',
      actorId: vendorId,
      vendorId,
      reason: `Vendor cancelled after accept: ${reason}`,
      terminalReason: 'VENDOR_CANCELLED',
    });

    if (!result.already) {
      const refundAmount = result.vendorOrder?.items?.reduce(
        (sum: number, item: any) => sum + item.orderItem.lineTotalFils,
        0
      ) || 0;

      try {
        await issueVendorOrderRefund({
          orderId: result.vendorOrder?.orderId as string,
          vendorOrderId,
          amountFils: refundAmount,
          reason: `Vendor cancelled after accept: ${reason}`,
          actorType: 'VENDOR',
          actorId: vendorId,
        });
      } catch (refundError) {
        console.error('Failed to issue refund:', refundError);
      }

      try {
        await checkAndUpdateParentOrderStatus(result.vendorOrder?.orderId as string);
      } catch (e) {
        console.error('Failed to update parent order status:', e);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Order cancelled by vendor and refund initiated',
        already: result.already,
        vendorOrder: {
          id: vendorOrderId,
          status: 'CANCELLED',
          cancelledAt: result.vendorOrder?.cancelledAt || new Date().toISOString(),
          itemCount: result.vendorOrder?.items?.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[vendor/cancel] Error:', error);
    
    // Handle auth errors
    if (error instanceof VendorOrderTransitionError) {
      if (error.code === 'NOT_FOUND' || error.code === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Vendor order not found' }, { status: 404 });
      }
      if (error.code === 'INVALID_TRANSITION' || error.code === 'INVALID_DATA' || error.code === 'CONFLICT') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

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
