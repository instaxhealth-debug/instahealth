/**
 * Order Event Logging - System of Record
 * All state changes must be logged here
 */

import { prisma } from '@/lib/prisma';
import { ActorType } from '@prisma/client';

export interface OrderEventInput {
  orderId?: string;
  vendorOrderId?: string;
  actorType: ActorType;
  actorId?: string;
  eventType: string;
  data?: any;
}

/**
 * Log an order event
 * This is the primary audit trail
 */
export async function logOrderEvent(input: OrderEventInput) {
  try {
    const event = await prisma.orderEvent.create({
      data: {
        orderId: input.orderId,
        vendorOrderId: input.vendorOrderId,
        actorType: input.actorType,
        actorId: input.actorId,
        eventType: input.eventType,
        data: input.data || null,
      },
    });

    console.log(`[OrderEvent] ${input.eventType}`, {
      orderId: input.orderId,
      vendorOrderId: input.vendorOrderId,
      actor: `${input.actorType}:${input.actorId}`,
      data: input.data,
    });

    return event;
  } catch (error) {
    console.error('[OrderEvent] Failed to log event', error);
    throw error;
  }
}

/**
 * Get event history for an order
 */
export async function getOrderEventHistory(orderId: string) {
  return await prisma.orderEvent.findMany({
    where: { orderId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get event history for a vendor order
 */
export async function getVendorOrderEventHistory(vendorOrderId: string) {
  return await prisma.orderEvent.findMany({
    where: { vendorOrderId },
    orderBy: { createdAt: 'asc' },
  });
}
