/**
 * POST /api/vendor/orders/[id]/update-status
 * 
 * Vendor updates fulfillment status:
 * READY_FOR_FULFILLMENT → ACCEPTED → IN_PROGRESS → COMPLETED
 *
 * CONCURRENCY SAFE: Uses WHERE guard to validate transitions
 */

import { NextRequest, NextResponse } from 'next/server';
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
    const { newStatus } = body;

    const { vendorId } = await requireVendor();

    if (!newStatus) {
      return NextResponse.json(
        { error: 'New status is required' },
        { status: 400 }
      );
    }

    const validStatuses = [
      'NEW',
      'READY_FOR_FULFILLMENT',
      'ACCEPTED',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'FAILED',
    ];

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    if (newStatus === 'REJECTED') {
      return NextResponse.json(
        { error: 'Use /reject endpoint for rejection (reason required)' },
        { status: 400 }
      );
    }

    const result = await transitionVendorOrder({
      vendorOrderId,
      targetStatus: newStatus,
      actorType: 'VENDOR',
      actorId: vendorId,
      vendorId,
    });

    if (newStatus === 'COMPLETED') {
      try {
        await checkAndUpdateParentOrderStatus(result.vendorOrder?.orderId as string);
      } catch (e) {
        console.error('Failed to update parent order status:', e);
      }
    }

    return NextResponse.json(
      {
        success: true,
        already: result.already,
        vendorOrder: {
          id: result.vendorOrder?.id,
          status: result.vendorOrder?.status,
          updatedAt: result.vendorOrder?.updatedAt,
          fulfilledAt: result.vendorOrder?.fulfilledAt,
          itemCount: result.vendorOrder?.items?.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[vendor/update-status] Error:', error);
    
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
