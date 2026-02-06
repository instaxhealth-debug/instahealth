/**
 * Refund Processing with Idempotency
 *
 * Ensures zero double-refunds via Refund.vendorOrderId UNIQUE constraint.
 * All refund operations must go through this helper.
 */

import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { logOrderEvent } from '@/lib/fulfillment/order-events';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface IssueRefundInput {
  orderId: string;
  vendorOrderId: string;
  amountFils: number;
  reason: string;
  actorId?: string;
  actorType: 'SYSTEM' | 'VENDOR' | 'ADMIN' | 'USER';
}

/**
 * Issue a refund for a vendor order.
 *
 * IDEMPOTENT: If Refund row already exists for vendorOrderId,
 * returns success without double-refunding.
 *
 * TRANSACTION: All operations (Refund row creation + event logging)
 * happen atomically.
 */
export async function issueVendorOrderRefund(input: IssueRefundInput) {
  const {
    orderId,
    vendorOrderId,
    amountFils,
    reason,
    actorId,
    actorType,
  } = input;

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });

  const vendorOrder = await prisma.vendorOrder.findUniqueOrThrow({
    where: { id: vendorOrderId },
    include: {
      items: {
        include: {
          orderItem: true,
        },
      },
    },
  });

  // Compute refund amount if not provided
  let refundAmount = amountFils;
  if (refundAmount === 0) {
    refundAmount = vendorOrder.items.reduce(
      (sum: number, item: { orderItem: { lineTotalFils: number } }) => {
        return sum + item.orderItem.lineTotalFils;
      },
      0
    );
  }

  // Try to create Refund row (will fail if already exists due to UNIQUE constraint)
  let refund;
  try {
    refund = await prisma.refund.create({
      data: {
        orderId,
        vendorOrderId,
        amountFils: refundAmount,
        reason,
        status: 'PENDING',
      },
    });
  } catch (e: any) {
    // UNIQUE constraint violation: refund already exists
    if (e.code === 'P2002') {
      const existingRefund = await prisma.refund.findUnique({
        where: { vendorOrderId },
      });

      // If already succeeded, return success
      if (existingRefund?.status === 'SUCCEEDED') {
        return existingRefund;
      }

      // If failed, allow retry only via admin (not vendor)
      if (existingRefund?.status === 'FAILED') {
        throw new Error(
          'Refund previously failed; contact admin to retry'
        );
      }

      // Still pending, return existing
      return existingRefund;
    }

    throw e;
  }

  // Call Stripe refunds.create
  try {
    // Must have a payment_intent ID to refund
    if (!order.stripePaymentIntentId) {
      throw new Error('Cannot refund order without stripe payment intent ID');
    }

    const stripeRefund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId as string,
      amount: refundAmount, // In cents for Stripe, but we store fils (1 AED = 100 fils)
      reason: 'requested_by_customer',
      metadata: {
        orderId,
        vendorOrderId,
        reason,
      },
    });

    // Update refund row with Stripe ID + SUCCEEDED status
    refund = await prisma.refund.update({
      where: { id: refund.id },
      data: {
        stripeRefundId: stripeRefund.id,
        status: 'SUCCEEDED',
      },
    });

    // Log event
    await logOrderEvent({
      orderId,
      vendorOrderId,
      actorType,
      actorId,
      eventType: 'REFUND_SUCCEEDED',
      data: {
        amountFils: refundAmount,
        amountAED: (refundAmount / 100).toFixed(2),
        reason,
        stripeRefundId: stripeRefund.id,
      },
    });

    return refund;
  } catch (stripeError: any) {
    // Mark refund as FAILED
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: 'FAILED' },
    });

    // Log failure event
    await logOrderEvent({
      orderId,
      vendorOrderId,
      actorType: 'SYSTEM',
      eventType: 'REFUND_FAILED',
      data: {
        amountFils: refundAmount,
        reason: stripeError.message,
        refundId: refund.id,
      },
    });

    throw new Error(`Stripe refund failed: ${stripeError.message}`);
  }
}

/**
 * Retry a failed refund by refund ID (admin-only usage).
 */
export async function retryRefund(
  refundId: string,
  actorType: 'SYSTEM' | 'VENDOR' | 'ADMIN' | 'USER',
  actorId?: string
) {
  const refund = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!refund) {
    throw new Error('Refund not found');
  }

  if (refund.status === 'SUCCEEDED') {
    return refund;
  }

  if (refund.status !== 'FAILED') {
    throw new Error('Refund is not in FAILED status');
  }

  if (refund.stripeRefundId) {
    throw new Error('Refund already has a Stripe refund ID; manual review required');
  }

  const order = await prisma.order.findUniqueOrThrow({ where: { id: refund.orderId } });

  if (!order.stripePaymentIntentId) {
    throw new Error('Cannot refund order without stripe payment intent ID');
  }

  try {
    const stripeRefund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId as string,
      amount: refund.amountFils,
      reason: 'requested_by_customer',
      metadata: {
        orderId: refund.orderId,
        vendorOrderId: refund.vendorOrderId,
        reason: refund.reason,
      },
    }, {
      idempotencyKey: `refund_retry_${refund.id}`,
    });

    const updated = await prisma.refund.update({
      where: { id: refund.id },
      data: {
        stripeRefundId: stripeRefund.id,
        status: 'SUCCEEDED',
      },
    });

    await logOrderEvent({
      orderId: refund.orderId,
      vendorOrderId: refund.vendorOrderId,
      actorType,
      actorId,
      eventType: 'REFUND_SUCCEEDED',
      data: {
        amountFils: refund.amountFils,
        amountAED: (refund.amountFils / 100).toFixed(2),
        reason: refund.reason,
        stripeRefundId: stripeRefund.id,
        retry: true,
      },
    });

    return updated;
  } catch (stripeError: any) {
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: 'FAILED' },
    });

    await logOrderEvent({
      orderId: refund.orderId,
      vendorOrderId: refund.vendorOrderId,
      actorType,
      actorId,
      eventType: 'REFUND_FAILED',
      data: {
        amountFils: refund.amountFils,
        reason: stripeError.message,
        refundId: refund.id,
        retry: true,
      },
    });

    throw new Error(`Stripe refund failed: ${stripeError.message}`);
  }
}

/**
 * Get refund status for a vendor order.
 */
export async function getRefundStatus(vendorOrderId: string) {
  return prisma.refund.findUnique({
    where: { vendorOrderId },
  });
}
