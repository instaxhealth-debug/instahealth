/**
 * Vendor Order Service
 * Handles creation, state transitions, and business logic
 */

import { prisma } from '@/lib/prisma';
import { logOrderEvent } from './order-events';
import { ActorType, VendorOrderStatus } from '@prisma/client';
import { issueVendorOrderRefund } from '@/lib/payments/refunds';

/**
 * Create vendor orders from an order
 * Used for pre-payment (NEW) and post-payment (READY_FOR_FULFILLMENT)
 */
export async function createVendorOrders(
  orderId: string,
  status: VendorOrderStatus = 'READY_FOR_FULFILLMENT'
) {
  try {
    // Get order with items grouped by vendor
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (!['PENDING_PAYMENT', 'PAID', 'FULFILLING', 'FULFILLED'].includes(order.status)) {
      throw new Error(`Order ${orderId} is not in a valid state to create vendor orders`);
    }

    // If vendor orders already exist, return them (idempotent)
    const existing = await prisma.vendorOrder.findFirst({
      where: { orderId },
    });
    if (existing) {
      return await prisma.vendorOrder.findMany({
        where: { orderId },
        include: { items: true },
      });
    }

    // Group items by vendor
    const itemsByVendor: Record<string, any[]> = {};
    for (const item of order.items) {
      if (!itemsByVendor[item.vendorId]) {
        itemsByVendor[item.vendorId] = [];
      }
      itemsByVendor[item.vendorId].push(item);
    }

    // Create a VendorOrder for each vendor
    const createdVendorOrders = [];
    const acceptByTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    for (const [vendorId, items] of Object.entries(itemsByVendor)) {
      const subtotalFils = items.reduce((sum, item) => sum + item.lineTotalFils, 0);

      const vendorOrder = await prisma.vendorOrder.create({
        data: {
          orderId,
          vendorId,
          status,
          subtotalFils,
          totalFils: subtotalFils,
          acceptBy: acceptByTime,
          notesToVendor: `Please accept or reject this order within ${15} minutes.`,
        },
        include: {
          vendor: true,
          items: true,
        },
      });

      // Attach order items to vendor order
      for (const item of items) {
        await prisma.vendorOrderItem.create({
          data: {
            vendorOrderId: vendorOrder.id,
            orderItemId: item.id,
          },
        });
      }

      // Log event
      await logOrderEvent({
        orderId,
        vendorOrderId: vendorOrder.id,
        actorType: ActorType.SYSTEM,
        eventType: 'VENDOR_ORDER_CREATED',
        data: {
          vendorId,
          vendorName: vendorOrder.vendor.name,
          itemCount: items.length,
          acceptByTime: acceptByTime.toISOString(),
        },
      });

      createdVendorOrders.push(vendorOrder);
    }

    // Log order creation event
    await logOrderEvent({
      orderId,
      actorType: ActorType.SYSTEM,
      eventType: 'VENDOR_ORDER_CREATED',
      data: {
        status,
        vendorOrderCount: createdVendorOrders.length,
      },
    });

    console.log(`[VendorOrders] Created ${createdVendorOrders.length} vendor orders for order ${orderId}`);
    return createdVendorOrders;
  } catch (error) {
    console.error('[VendorOrders] Failed to create vendor orders', error);
    throw error;
  }
}

/**
 * Vendor accepts their portion of the order
 */
export async function acceptVendorOrder(vendorOrderId: string, vendorId: string) {
  try {
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        vendor: true,
        order: true,
      },
    });

    if (!vendorOrder) {
      throw new Error(`VendorOrder ${vendorOrderId} not found`);
    }

    // Verify vendor owns this order
    if (vendorOrder.vendorId !== vendorId) {
      throw new Error(`Vendor ${vendorId} does not own VendorOrder ${vendorOrderId}`);
    }

    // Verify status is READY_FOR_FULFILLMENT
    if (vendorOrder.status !== 'READY_FOR_FULFILLMENT') {
      throw new Error(`VendorOrder ${vendorOrderId} is not in READY_FOR_FULFILLMENT status (current: ${vendorOrder.status})`);
    }

    // Verify acceptBy deadline not passed
    if (new Date() > vendorOrder.acceptBy) {
      throw new Error(`VendorOrder ${vendorOrderId} acceptance deadline has passed`);
    }

    // Update status
    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      include: {
        vendor: true,
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });

    // Log event
    await logOrderEvent({
      vendorOrderId,
      orderId: vendorOrder.orderId,
      actorType: ActorType.VENDOR,
      actorId: vendorId,
      eventType: 'VENDOR_ACCEPTED',
      data: {
        vendorName: vendorOrder.vendor.name,
        itemCount: updated.items.length,
        acceptedAt: updated.acceptedAt?.toISOString(),
      },
    });

    console.log(`[VendorOrder] Vendor ${vendorId} accepted order portion ${vendorOrderId}`);
    return updated;
  } catch (error) {
    console.error('[VendorOrder] Failed to accept vendor order', error);
    throw error;
  }
}

/**
 * Vendor rejects their portion of the order
 */
export async function rejectVendorOrder(
  vendorOrderId: string,
  vendorId: string,
  rejectionReason: string
) {
  try {
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        vendor: true,
        order: {
          include: {
            items: true,
          },
        },
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });

    if (!vendorOrder) {
      throw new Error(`VendorOrder ${vendorOrderId} not found`);
    }

    // Verify vendor owns this order
    if (vendorOrder.vendorId !== vendorId) {
      throw new Error(`Vendor ${vendorId} does not own VendorOrder ${vendorOrderId}`);
    }

    // Can only reject if READY_FOR_FULFILLMENT
    if (vendorOrder.status !== 'READY_FOR_FULFILLMENT') {
      throw new Error(
        `Cannot reject VendorOrder ${vendorOrderId} with status ${vendorOrder.status}`
      );
    }

    // Update status
    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        notesInternal: rejectionReason,
      },
      include: {
        vendor: true,
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });

    // Log event
    await logOrderEvent({
      vendorOrderId,
      orderId: vendorOrder.orderId,
      actorType: ActorType.VENDOR,
      actorId: vendorId,
      eventType: 'VENDOR_REJECTED',
      data: {
        vendorName: vendorOrder.vendor.name,
        itemCount: updated.items.length,
        reason: rejectionReason,
        rejectedAt: updated.rejectedAt?.toISOString(),
      },
    });

    // Process partial refund for this vendor's items
    const refundAmountFils = updated.items.reduce((sum, item) => {
      return sum + item.orderItem.lineTotalFils;
    }, 0);

    await issueVendorOrderRefund({
      orderId: vendorOrder.orderId,
      vendorOrderId,
      amountFils: refundAmountFils,
      reason: `Vendor rejected: ${rejectionReason}`,
      actorType: ActorType.VENDOR,
      actorId: vendorId,
    });

    console.log(
      `[VendorOrder] Vendor ${vendorId} rejected order portion ${vendorOrderId}, refunding ${refundAmountFils} fils`
    );
    return updated;
  } catch (error) {
    console.error('[VendorOrder] Failed to reject vendor order', error);
    throw error;
  }
}

/**
 * Update vendor order status (READY_FOR_FULFILLMENT → ACCEPTED → IN_PROGRESS → COMPLETED)
 */
export async function updateVendorOrderStatus(
  vendorOrderId: string,
  vendorId: string,
  newStatus: VendorOrderStatus
) {
  try {
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        vendor: true,
        order: true,
      },
    });

    if (!vendorOrder) {
      throw new Error(`VendorOrder ${vendorOrderId} not found`);
    }

    // Verify vendor owns this order
    if (vendorOrder.vendorId !== vendorId) {
      throw new Error(`Vendor ${vendorId} does not own VendorOrder ${vendorOrderId}`);
    }

    // Validate status transition
    const validTransitions: Record<VendorOrderStatus, VendorOrderStatus[]> = {
      NEW: ['READY_FOR_FULFILLMENT', 'CANCELLED'],
      READY_FOR_FULFILLMENT: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      REJECTED: [],
      CANCELLED: [],
      FAILED: [],
    };

    const allowedTransitions = validTransitions[vendorOrder.status as VendorOrderStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Cannot transition VendorOrder from ${vendorOrder.status} to ${newStatus}`
      );
    }

    // Update status
    const dataToUpdate: any = {
      status: newStatus,
    };

    // Set fulfilled timestamp if completed
    if (newStatus === 'COMPLETED') {
      dataToUpdate.fulfilledAt = new Date();
    }

    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: dataToUpdate,
      include: {
        vendor: true,
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });

    // Log event
    await logOrderEvent({
      vendorOrderId,
      orderId: vendorOrder.orderId,
      actorType: ActorType.VENDOR,
      actorId: vendorId,
      eventType: 'VENDOR_STATUS_CHANGED',
      data: {
        from: vendorOrder.status,
        to: newStatus,
        vendorName: vendorOrder.vendor.name,
      },
    });

    // Check if all vendor orders are fulfilled
    if (newStatus === 'COMPLETED') {
      await checkAndUpdateParentOrderStatus(vendorOrder.orderId);
    }

    console.log(`[VendorOrder] Updated ${vendorOrderId} status: ${vendorOrder.status} → ${newStatus}`);
    return updated;
  } catch (error) {
    console.error('[VendorOrder] Failed to update vendor order status', error);
    throw error;
  }
}

/**
 * Check if all vendor orders are fulfilled and update parent order if so
 */
async function checkAndUpdateParentOrderStatus(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendorOrders: true,
      },
    });

    if (!order) return;

    // Get all vendor orders
    const vendorOrders = order.vendorOrders;

    // Check if all are in terminal state
    const allFulfilled = vendorOrders.every(
      (vo) => vo.status === 'COMPLETED' || vo.status === 'CANCELLED' || vo.status === 'REJECTED'
    );

    if (allFulfilled) {
      // Determine final order status
      const hasRejected = vendorOrders.some((vo) => vo.status === 'REJECTED');
      const hasDelivered = vendorOrders.some((vo) => vo.status === 'COMPLETED');

      let finalStatus = 'FULFILLED';
      if (hasRejected && hasDelivered) {
        finalStatus = 'PARTIALLY_FULFILLED';
      } else if (vendorOrders.every((vo) => vo.status === 'REJECTED' || vo.status === 'CANCELLED')) {
        finalStatus = 'CANCELLED';
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: finalStatus,
        },
      });

      await logOrderEvent({
        orderId,
        actorType: ActorType.SYSTEM,
        eventType: 'ORDER_STATUS_CHANGED',
        data: {
          from: 'FULFILLING',
          to: finalStatus,
          reason: 'All vendor orders completed',
        },
      });

      console.log(`[Order] Order ${orderId} transitioned to ${finalStatus}`);
    }
  } catch (error) {
    console.error('[Order] Failed to update parent order status', error);
    // Don't throw - this is a secondary check
  }
}
