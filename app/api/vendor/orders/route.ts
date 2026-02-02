import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireVendor } from '@/lib/auth/requireVendor';

/**
 * GET /api/vendor/orders
 * 
 * List all vendor orders for the authenticated vendor.
 * Vendor ID comes from authenticated session ONLY (no x-vendor-id header).
 *
 * Query params: ?status=PENDING_ACCEPTANCE&limit=50&offset=0
 */
export async function GET(req: NextRequest) {
  try {
    const { vendorId } = await requireVendor();

    // Parse query params
    const status = req.nextUrl.searchParams.get('status');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    // Build where clause
    const where: any = { vendorId };
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.vendorOrder.count({ where });

    // Get vendor orders
    const vendorOrders = await prisma.vendorOrder.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            shippingName: true,
            shippingPhone: true,
            shippingAddressLine1: true,
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
                lineTotalFils: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // Format response
    const now = new Date();
    const formatted = vendorOrders.map((vo) => {
      const timeUntilExpiry = vo.acceptBy.getTime() - now.getTime();
      const isExpired = timeUntilExpiry < 0;
      const minutesRemaining = Math.ceil(timeUntilExpiry / (1000 * 60));

      return {
        id: vo.id,
        orderId: vo.order.id,
        status: vo.status,
        createdAt: vo.createdAt,
        acceptBy: vo.acceptBy,
        acceptedAt: vo.acceptedAt,
        rejectedAt: vo.rejectedAt,
        fulfilledAt: vo.fulfilledAt,
        cancelledAt: vo.cancelledAt,
        isExpired,
        minutesRemaining: isExpired ? 0 : minutesRemaining,
        customer: {
          name: vo.order.shippingName,
          phone: vo.order.shippingPhone,
          address: vo.order.shippingAddressLine1,
        },
        amount: {
          fils: vo.order.totalFils,
          aed: (vo.order.totalFils / 100).toFixed(2),
        },
        items: vo.items.map((item) => ({
          id: item.orderItem.id,
          productName: item.orderItem.productName,
          quantity: item.orderItem.quantity,
          lineTotalFils: item.orderItem.lineTotalFils,
          lineAED: (item.orderItem.lineTotalFils / 100).toFixed(2),
        })),
        notes: {
          toVendor: vo.notesToVendor,
          internal: vo.notesInternal,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        limit,
        offset,
        count: formatted.length,
        hasMore: offset + formatted.length < total,
      },
    });
  } catch (error) {
    console.error('[API] Get vendor orders failed:', error);
    
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
        error: error instanceof Error ? error.message : 'Failed to fetch vendor orders',
      },
      { status: 500 }
    );
  }
}
