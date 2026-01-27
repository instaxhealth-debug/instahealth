import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Stripe webhook handler
 * Handles checkout.session.completed events to mark orders as PAID
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No stripe-signature header found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log('Checkout session completed:', session.id);

      // Find order by Stripe session ID
      const order = await prisma.order.findUnique({
        where: { stripeCheckoutSessionId: session.id },
      });

      if (!order) {
        console.error('Order not found for session:', session.id);
        // Return 200 to acknowledge webhook (don't retry for missing orders)
        return NextResponse.json({ received: true, warning: 'Order not found' });
      }

      // Check if already paid (idempotency)
      if (order.status === 'PAID') {
        console.log('Order already marked as PAID:', order.id);
        return NextResponse.json({ received: true, alreadyPaid: true });
      }

      // Update order status to PAID and store payment intent ID
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          stripePaymentIntentId: session.payment_intent as string,
        },
      });

      console.log('Order marked as PAID:', order.id);
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log('Payment failed:', paymentIntent.id);

      // Find order by payment intent ID
      const order = await prisma.order.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (order && order.status === 'PENDING_PAYMENT') {
        // Keep status as PENDING_PAYMENT (don't change, just log)
        console.log('Payment failed for order:', order.id, '- status remains PENDING_PAYMENT');
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      console.log('Refund processed:', charge.id);

      // Find order by payment intent ID
      const order = await prisma.order.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (order && order.status !== 'REFUNDED') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'REFUNDED' },
        });
        console.log('Order marked as REFUNDED:', order.id);
      }
    } else {
      console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
