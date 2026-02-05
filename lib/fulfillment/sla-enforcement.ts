/**
 * SLA Enforcement Job
 * Runs periodically to auto-cancel vendor orders that exceed the acceptance deadline
 * Should run every 1-5 minutes via cron or API endpoint
 *
 * IDEMPOTENT: Safe to run multiple times. Only updates orders with
 * status = READY_FOR_FULFILLMENT and acceptBy < now.
 */

import { prisma } from '@/lib/prisma';
import { logOrderEvent } from './order-events';
import { ActorType } from '@prisma/client';
import { issueVendorOrderRefund } from '@/lib/payments/refunds';
import { checkAndUpdateParentOrderStatus } from './parent-status';

export interface SLAEnforcementResult {
  expiredOrderIds: string[];
  cancelledCount: number;
  refundCount: number;
  errors: any[];
}

/**
 * Check for expired vendor orders and auto-cancel them
 * This is idempotent - running multiple times is safe
 *
 * Concurrency safe: Uses WHERE guard to only update
 * READY_FOR_FULFILLMENT orders with acceptBy < now
 */
export async function enforceSLA(): Promise<SLAEnforcementResult> {
  const result: SLAEnforcementResult = {
    expiredOrderIds: [],
    cancelledCount: 0,
    refundCount: 0,
    errors: [],
  };

  try {
    // Find all ready-for-fulfillment vendor orders where acceptBy < now
    // This query is safe to run multiple times (only finds expired)
    const expiredVendorOrders = await prisma.vendorOrder.findMany({
      where: {
        status: 'READY_FOR_FULFILLMENT',
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
        // Update with WHERE guard to ensure still READY_FOR_FULFILLMENT
        // (prevents race if another process already updated it)
        const updated = await prisma.vendorOrder.updateMany({
          where: {
            id: vendorOrder.id,
            status: 'READY_FOR_FULFILLMENT', // Guard: only update if still ready
            acceptBy: {
              lt: new Date(),
            },
          },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            notesInternal: `Auto-cancelled by SLA enforcement at ${new Date().toISOString()}`,
            terminalReason: 'SLA_EXPIRED',
            resolutionNotes: `Vendor did not accept order within deadline. AcceptBy: ${vendorOrder.acceptBy.toISOString()}`,
          },
        });

        // If 0 rows updated, this order was already processed elsewhere
        if (updated.count === 0) {
          console.log(`[SLA] Order ${vendorOrder.id} already processed, skipping`);
          continue;
        }

        // Log event
        await logOrderEvent({
          vendorOrderId: vendorOrder.id,
          orderId: vendorOrder.orderId,
          actorType: ActorType.SYSTEM,
          eventType: 'VENDOR_SLA_EXPIRED',
          data: {
            vendorName: vendorOrder.vendor.name,
            acceptByTime: vendorOrder.acceptBy.toISOString(),
            expiredAt: new Date().toISOString(),
            minutesOverdue: Math.floor(
              (Date.now() - vendorOrder.acceptBy.getTime()) / (1000 * 60)
            ),
            itemCount: vendorOrder.items.length,
          },
        });

        result.expiredOrderIds.push(vendorOrder.id);
        result.cancelledCount++;

        // Process refund via idempotent refund helper
        try {
          // Calculate refund amount: sum of line totals
          const refundAmount = vendorOrder.items.reduce(
            (sum, item) => sum + item.orderItem.lineTotalFils,
            0
          );

          await issueVendorOrderRefund({
            orderId: vendorOrder.orderId,
            vendorOrderId: vendorOrder.id,
            amountFils: refundAmount,
            reason: 'SLA expired - vendor did not accept in time',
            actorType: ActorType.SYSTEM,
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
      status: 'READY_FOR_FULFILLMENT',
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

  return pendingOrders.map((vo) => {
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
