/**
 * SLA Enforcement Job
 * Runs periodically to auto-reject vendor orders that exceed the acceptance deadline
 * Should run every 1-5 minutes via cron or API endpoint
 *
 * IDEMPOTENT: Safe to run multiple times. Only updates orders with
 * status IN (NEW, READY_FOR_FULFILLMENT) and acceptBy < now.
 */

import { prisma } from '@/lib/prisma';
import { issueVendorOrderRefund } from '@/lib/payments/refunds';
import { checkAndUpdateParentOrderStatus } from './parent-status';
import { transitionVendorOrder, VendorOrderTransitionError } from './vendor-order-machine';

export interface SLAEnforcementResult {
  expiredOrderIds: string[];
  cancelledCount: number;
  processedCount: number;
  skippedCount: number;
  refundCount: number;
  errors: any[];
}

/**
 * Check for expired vendor orders and auto-reject them
 * This is idempotent - running multiple times is safe
 *
 * Concurrency safe: Uses WHERE guard to only update
 * NEW/READY_FOR_FULFILLMENT orders with acceptBy < now
 */
export async function enforceSLA(): Promise<SLAEnforcementResult> {
  const result: SLAEnforcementResult = {
    expiredOrderIds: [],
    cancelledCount: 0,
    processedCount: 0,
    skippedCount: 0,
    refundCount: 0,
    errors: [],
  };

  try {
    // Find all NEW/READY_FOR_FULFILLMENT vendor orders where acceptBy < now
    // This query is safe to run multiple times (only finds expired)
    const expiredVendorOrders = await prisma.vendorOrder.findMany({
      where: {
        status: { in: ['NEW', 'READY_FOR_FULFILLMENT'] },
        acceptBy: {
          lt: new Date(),
        },
      },
      include: {
        vendor: true,
        order: true,
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });

    console.log(`[SLA] Found ${expiredVendorOrders.length} expired vendor orders`);

    for (const vendorOrder of expiredVendorOrders) {
      try {
        const transition = await transitionVendorOrder({
          vendorOrderId: vendorOrder.id,
          targetStatus: 'REJECTED',
          actorType: 'SYSTEM',
          actorId: 'system',
          terminalReason: 'SLA_EXPIRED',
          reason: `Auto-rejected by SLA enforcement at ${new Date().toISOString()}`,
          overrideEventType: 'VENDOR_SLA_EXPIRED_AUTO_REJECT',
          allowExpiredAcceptBy: true,
        });

        if (transition.already) {
          result.skippedCount++;
          continue;
        }

        result.expiredOrderIds.push(vendorOrder.id);
        result.cancelledCount++;
        result.processedCount++;

        // Process refund via idempotent refund helper
        try {
          // Calculate refund amount: sum of line totals
          const refundAmount = vendorOrder.items.reduce(
            (sum: number, item: { orderItem: { lineTotalFils: number } }) =>
              sum + item.orderItem.lineTotalFils,
            0
          );

          await issueVendorOrderRefund({
            orderId: vendorOrder.orderId,
            vendorOrderId: vendorOrder.id,
            amountFils: refundAmount,
            reason: 'SLA expired - vendor did not accept in time',
            actorType: 'SYSTEM',
          });

          result.refundCount++;
        } catch (refundError) {
          console.error(
            `[SLA] Failed to process refund for expired order ${vendorOrder.id}`,
            refundError
          );
          result.errors.push({
            vendorOrderId: vendorOrder.id,
            phase: 'refund',
            error: refundError instanceof Error ? refundError.message : String(refundError),
          });
          // Continue - don't fail entire SLA job
        }

        // Update parent order status
        try {
          await checkAndUpdateParentOrderStatus(vendorOrder.orderId);
        } catch (statusError) {
          console.error(
            `[SLA] Failed to update parent order status for ${vendorOrder.orderId}`,
            statusError
          );
          result.errors.push({
            orderId: vendorOrder.orderId,
            phase: 'parent_status',
            error: statusError instanceof Error ? statusError.message : String(statusError),
          });
        }
      } catch (error) {
        console.error(
          `[SLA] Failed to process expired vendor order ${vendorOrder.id}`,
          error
        );
        result.errors.push({
          vendorOrderId: vendorOrder.id,
          phase: 'cancellation',
          error: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof VendorOrderTransitionError && error.code === 'CONFLICT') {
          result.skippedCount++;
        }
      }
    }

    console.log(`[SLA] Enforcement complete: ${result.cancelledCount} cancelled, ${result.refundCount} refunds`);
    return result;
  } catch (error) {
    console.error('[SLA] Enforcement job failed', error);
    result.errors.push({
      phase: 'general',
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }
}

/**
 * Get current SLA status for all ready-for-fulfillment vendor orders
 */
export async function getSLAStatus() {
  const pendingOrders = await prisma.vendorOrder.findMany({
    where: {
      status: { in: ['NEW', 'READY_FOR_FULFILLMENT'] },
    },
    include: {
      vendor: true,
      order: {
        select: {
          id: true,
          shippingName: true,
          totalFils: true,
        },
      },
    },
    orderBy: {
      acceptBy: 'asc',
    },
  });

  const now = new Date();

  return pendingOrders.map((vo: any) => {
    const timeUntilExpiry = vo.acceptBy.getTime() - now.getTime();
    const isExpired = timeUntilExpiry < 0;
    const minutesRemaining = Math.ceil(timeUntilExpiry / (1000 * 60));

    return {
      vendorOrderId: vo.id,
      orderId: vo.orderId,
      vendorName: vo.vendor.name,
      customerName: vo.order.shippingName,
      acceptBy: vo.acceptBy.toISOString(),
      isExpired,
      minutesRemaining: isExpired ? 0 : minutesRemaining,
      amountAED: (vo.order.totalFils / 100).toFixed(2),
    };
  });
}
