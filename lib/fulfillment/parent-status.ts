/**
 * Parent Order Status Resolution
 *
 * Deterministically updates parent Order status based on all VendorOrder states.
 * Called whenever a VendorOrder reaches a terminal state.
 */

import { prisma } from '@/lib/prisma';
import { logOrderEvent } from '@/lib/fulfillment/order-events';
import { ActorType } from '@prisma/client';

const TERMINAL_VENDOR_STATUSES = new Set([
  'DELIVERED',
  'REJECTED',
  'CANCELLED',
  'CANCELLED_BY_VENDOR',
  'FAILED',
]);

/**
 * Update parent Order status based on all VendorOrder statuses.
 *
 * Rules:
 * - If all VendorOrders are terminal:
 *   - All DELIVERED → Order = FULFILLED
 *   - Some DELIVERED, rest terminal non-delivered → Order = PARTIALLY_FULFILLED
 *   - None delivered, all terminal non-delivered → Order = CANCELLED
 * - Otherwise: Order = FULFILLING
 */
export async function checkAndUpdateParentOrderStatus(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });

  const vendorOrders = await prisma.vendorOrder.findMany({
    where: { orderId },
  });

  // Count terminal states
  let deliveredCount = 0;
  let terminalCount = 0;

  for (const vo of vendorOrders) {
    if (TERMINAL_VENDOR_STATUSES.has(vo.status)) {
      terminalCount++;
    }
    if (vo.status === 'DELIVERED') {
      deliveredCount++;
    }
  }

  let newStatus = order.status;
  let reason = '';

  // All vendors have responded (reached terminal state)
  if (terminalCount === vendorOrders.length && vendorOrders.length > 0) {
    if (deliveredCount === vendorOrders.length) {
      // All delivered
      newStatus = 'FULFILLED';
      reason = 'All vendor orders delivered';
    } else if (deliveredCount > 0) {
      // Some delivered
      newStatus = 'PARTIALLY_FULFILLED';
      reason = `${deliveredCount} of ${vendorOrders.length} vendor orders delivered`;
    } else {
      // None delivered (all rejected/cancelled)
      newStatus = 'CANCELLED';
      reason = 'All vendor orders cancelled/rejected';
    }
  } else if (order.status === 'PAID') {
    // Payment confirmed but vendor orders not yet created
    newStatus = 'FULFILLING';
    reason = 'Vendor orders created, awaiting acceptance';
  }

  // Only update if status actually changed
  if (newStatus !== order.status) {
    const oldStatus = order.status;

    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    // Log the transition
    await logOrderEvent({
      orderId,
      actorType: ActorType.SYSTEM,
      eventType: 'ORDER_STATUS_CHANGED',
      data: {
        from: oldStatus,
        to: newStatus,
        reason,
        vendorOrderStats: {
          total: vendorOrders.length,
          delivered: deliveredCount,
          terminal: terminalCount,
        },
      },
    });
  }
}
