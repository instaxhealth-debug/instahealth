/**
 * POST /api/vendor/orders/[id]/start
 *
 * Vendor starts fulfillment:
 * ACCEPTED → IN_PROGRESS
 *
 * CONCURRENCY SAFE: Uses WHERE guard to validate transition
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireVendor } from '@/lib/auth/requireVendor';
import { transitionVendorOrder, VendorOrderTransitionError } from '@/lib/fulfillment/vendor-order-machine';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendorOrderId = params.id;
    const { vendorId } = await requireVendor();

    const result = await transitionVendorOrder({
      vendorOrderId,
      targetStatus: 'IN_PROGRESS',
      actorType: 'VENDOR',
      actorId: vendorId,
      vendorId,
    });

    return NextResponse.json({
      success: true,
      already: result.already,
      vendorOrder: {
        id: vendorOrderId,
        status: 'IN_PROGRESS',
      },
    });
  } catch (error) {
    console.error('[vendor/start] Error:', error);

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