import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { createVendorOrders } from '@/lib/fulfillment/vendor-orders';
import { clearCart } from '@/lib/cart';
import { logOrderEvent } from '@/lib/fulfillment/order-events';
import { checkAndUpdateParentOrderStatus } from '@/lib/fulfillment/parent-status';
import { logMarketplaceEvent } from '@/lib/marketplace-events';
import { ActorType } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Stripe webhook handler
 *
 * Handles checkout.session.completed events to:
 * 1. Mark order as PAID
 * 2. Create VendorOrders for multi-vendor fulfillment
 * 3. Update parent order status to FULFILLING
 *
 * IDEMPOTENT: Running this handler multiple times is safe
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

      // Check if this is a service booking
      if (session.metadata?.kind === 'SERVICE_BOOKING') {
        const bookingId = session.metadata.bookingId;
        
        const booking = await prisma.serviceBooking.findUnique({
          where: { id: bookingId },
          include: {
            product: true,
            vendor: true,
          },
        });

        if (!booking) {
          console.error('Service booking not found:', bookingId);
          return NextResponse.json({ received: true, warning: 'Booking not found' });
        }

        // Check if already processed (idempotency)
        if (booking.status === 'PAID_AWAITING_SCHEDULE' || booking.status === 'SCHEDULED') {
          console.log('Booking already processed:', booking.id);
          return NextResponse.json({ received: true, alreadyProcessed: true });
        }

        // Update booking status
        await prisma.serviceBooking.update({
          where: { id: booking.id },
          data: {
            status: 'PAID_AWAITING_SCHEDULE',
            stripePaymentIntentId: session.payment_intent as string,
          },
        });

        console.log('Service booking marked as PAID:', booking.id);

        // Send confirmation emails (optional - implement if email is configured)
        try {
          const { sendEmail } = await import('@/lib/email');
          
          // Email to customer
          await sendEmail({
            to: booking.customerEmail,
            subject: `Booking Confirmed: ${booking.product.name}`,
            html: `
              <h2>Your booking is confirmed!</h2>
              <p>Hi ${booking.customerName},</p>
              <p>Your booking for <strong>${booking.product.name}</strong> with ${booking.vendor.name} has been confirmed.</p>
              <p><strong>Amount Paid:</strong> AED ${(booking.amountFils / 100).toFixed(2)}</p>
              ${booking.bookingUrlResolved ? `<p><a href="${booking.bookingUrlResolved}">Click here to schedule your exact time slot</a></p>` : ''}
              <p>Booking ID: ${booking.id}</p>
              <p>If you have any questions, please contact ${booking.vendor.name}.</p>
            `,
          });

          // Email to vendor (if vendor has email)
          if (booking.vendor.email) {
            await sendEmail({
              to: booking.vendor.email,
              subject: `New Booking: ${booking.product.name}`,
              html: `
                <h2>New booking received</h2>
                <p><strong>Service:</strong> ${booking.product.name}</p>
                <p><strong>Customer:</strong> ${booking.customerName}</p>
                <p><strong>Email:</strong> ${booking.customerEmail}</p>
                <p><strong>Phone:</strong> ${booking.customerPhone}</p>
                <p><strong>Amount:</strong> AED ${(booking.amountFils / 100).toFixed(2)}</p>
                ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
                <p>Booking ID: ${booking.id}</p>
                <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/vendor/bookings/${booking.id}">View in portal</a></p>
              `,
            });
          }
        } catch (emailError) {
          console.error('Failed to send booking confirmation emails:', emailError);
          // Don't fail the webhook if email fails
        }

        return NextResponse.json({ received: true, bookingProcessed: true });
      }

      // Otherwise handle as regular order
      const metadataOrderId = session.metadata?.orderId;
      const order = await prisma.order.findFirst({
        where: metadataOrderId
          ? { id: metadataOrderId }
          : { stripeCheckoutSessionId: session.id },
        include: {
          items: true,
        },
      });

      if (!order) {
        console.error('Order not found for session:', session.id);
        // Return 200 to acknowledge webhook (don't retry for missing orders)
        return NextResponse.json({ received: true, warning: 'Order not found' });
      }

      // Check if already paid (idempotency)
      if (order.status === 'PAID' || order.status === 'FULFILLING') {
        console.log('Order already processed:', order.id);
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }

      // Update order status to PAID and store payment intent ID
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          stripePaymentIntentId: session.payment_intent as string,
        },
      });

      if (order.userId) {
        await clearCart(order.userId);
      }

      // Log payment confirmation event
      await logOrderEvent({
        orderId: order.id,
        actorType: ActorType.SYSTEM,
        eventType: 'PAYMENT_CONFIRMED',
        data: {
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
        },
      });

      if (order.items?.length) {
        try {
          await Promise.all(
            order.items.map((item) =>
              logMarketplaceEvent({
                productId: item.productId,
                vendorId: item.vendorId,
                eventType: 'PURCHASE',
              })
            )
          );
        } catch (error) {
          console.error('[STRIPE:WEBHOOK] Failed to log purchase events', error);
        }
      }

      console.log('Order marked as PAID:', order.id);

      // Ensure vendor orders exist and are ready for fulfillment
      try {
        await createVendorOrders(order.id, 'READY_FOR_FULFILLMENT');

        // Promote any NEW vendor orders to READY_FOR_FULFILLMENT
        await prisma.vendorOrder.updateMany({
          where: { orderId: order.id, status: 'NEW' },
          data: {
            status: 'READY_FOR_FULFILLMENT',
            acceptBy: new Date(Date.now() + 15 * 60 * 1000),
          },
        });

        await checkAndUpdateParentOrderStatus(order.id);
      } catch (error) {
        console.error('Failed to update vendor orders:', error);
        await logOrderEvent({
          orderId: order.id,
          actorType: ActorType.SYSTEM,
          eventType: 'VENDOR_ORDER_UPDATE_FAILED',
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log('Payment intent succeeded:', paymentIntent.id);

      // Check if this is a service booking
      if (paymentIntent.metadata?.kind === 'SERVICE_BOOKING') {
        const bookingId = paymentIntent.metadata.bookingId;
        
        const booking = await prisma.serviceBooking.findUnique({
          where: { id: bookingId },
          include: {
            product: true,
            vendor: true,
          },
        });

        if (!booking) {
          console.error('Service booking not found:', bookingId);
          return NextResponse.json({ received: true, warning: 'Booking not found' });
        }

        // Check if already processed (idempotency)
        if (booking.status === 'PAID_AWAITING_SCHEDULE' || booking.status === 'SCHEDULED') {
          console.log('Booking already processed:', booking.id);
          return NextResponse.json({ received: true, alreadyProcessed: true });
        }

        // Update booking status
        await prisma.serviceBooking.update({
          where: { id: booking.id },
          data: {
            status: 'PAID_AWAITING_SCHEDULE',
          },
        });

        console.log('Service booking marked as PAID (via PaymentIntent):', booking.id);

        // Send confirmation emails
        try {
          const { sendEmail } = await import('@/lib/email');
          
          await sendEmail({
            to: booking.customerEmail,
            subject: `Booking Confirmed: ${booking.product.name}`,
            html: `
              <h2>Your booking is confirmed!</h2>
              <p>Hi ${booking.customerName},</p>
              <p>Your booking for <strong>${booking.product.name}</strong> with ${booking.vendor.name} has been confirmed.</p>
              <p><strong>Amount Paid:</strong> AED ${(booking.amountFils / 100).toFixed(2)}</p>
              ${booking.bookingUrlResolved ? `<p><a href="${booking.bookingUrlResolved}">Click here to schedule your exact time slot</a></p>` : ''}
              <p>Booking ID: ${booking.id}</p>
            `,
          });

          if (booking.vendor.email) {
            await sendEmail({
              to: booking.vendor.email,
              subject: `New Booking: ${booking.product.name}`,
              html: `
                <h2>New booking received</h2>
                <p><strong>Service:</strong> ${booking.product.name}</p>
                <p><strong>Customer:</strong> ${booking.customerName}</p>
                <p><strong>Email:</strong> ${booking.customerEmail}</p>
                <p><strong>Phone:</strong> ${booking.customerPhone}</p>
                <p><strong>Amount:</strong> AED ${(booking.amountFils / 100).toFixed(2)}</p>
                ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
                <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/vendor/bookings/${booking.id}">View in portal</a></p>
              `,
            });
          }
        } catch (emailError) {
          console.error('Failed to send booking confirmation emails:', emailError);
        }

        return NextResponse.json({ received: true, bookingProcessed: true });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log('Payment failed:', paymentIntent.id);

      // Find order by payment intent ID
      const order = await prisma.order.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (order && order.status === 'PENDING_PAYMENT') {
        // Mark as FAILED
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'FAILED' },
        });
        await logOrderEvent({
          orderId: order.id,
          actorType: ActorType.SYSTEM,
          eventType: 'PAYMENT_FAILED',
          data: {
            stripePaymentIntentId: paymentIntent.id,
          },
        });
        console.log('Payment failed for order:', order.id, '- status set to FAILED');
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const order = await prisma.order.findFirst({
        where: { stripeCheckoutSessionId: session.id },
      });

      if (order && order.status === 'PENDING_PAYMENT') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      console.log('Refund processed:', charge.id);

      // Find order by payment intent ID
      const order = await prisma.order.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (order) {
        await logOrderEvent({
          orderId: order.id,
          actorType: ActorType.SYSTEM,
          eventType: 'STRIPE_REFUND_PROCESSED',
          data: {
            stripeRefundId: charge.id,
            amount: charge.amount_refunded,
          },
        });
        console.log('Refund logged for order:', order.id);
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
