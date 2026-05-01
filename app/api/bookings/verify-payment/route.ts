import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const DEBUG_BOOKINGS = process.env.DEBUG_BOOKINGS === 'true';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface VerifyPaymentRequest {
  sessionId: string;
}

interface VerifyPaymentResponse {
  ok: boolean;
  booking?: {
    id: string;
    status: string;
    stripeCheckoutSessionId: string | null;
    stripePaymentIntentId: string | null;
    serviceName: string;
    scheduledDate: string;
    scheduledTime: string;
  };
  recovered?: boolean;
  error?: string;
}

/**
 * POST /api/bookings/verify-payment
 *
 * Recovery check endpoint for when Stripe succeeds but webhook fails.
 * Called from the success page to ensure booking status is properly updated.
 */
export async function POST(req: NextRequest): Promise<NextResponse<VerifyPaymentResponse>> {
  try {
    // Parse and validate request body
    const body = await req.json() as VerifyPaymentRequest;
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      if (DEBUG_BOOKINGS) {
        console.log('[verify-payment] Invalid sessionId:', sessionId);
      }
      return NextResponse.json(
        { ok: false, error: 'Missing or invalid sessionId' },
        { status: 400 }
      );
    }

    if (DEBUG_BOOKINGS) {
      console.log('[verify-payment] Verifying payment for session:', sessionId);
    }

    // Step 1: Fetch Stripe session
    let stripeSession: Stripe.Checkout.Session;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });

      if (DEBUG_BOOKINGS) {
        console.log('[verify-payment] Stripe session retrieved:', {
          id: stripeSession.id,
          payment_status: stripeSession.payment_status,
          status: stripeSession.status,
        });
      }
    } catch (stripeError) {
      console.error('[verify-payment] Failed to retrieve Stripe session:', stripeError);
      return NextResponse.json(
        { ok: false, error: 'Failed to retrieve payment session from Stripe' },
        { status: 500 }
      );
    }

    // Step 2: Check if payment was successful
    if (stripeSession.payment_status !== 'paid') {
      if (DEBUG_BOOKINGS) {
        console.log('[verify-payment] Payment not completed:', {
          sessionId,
          payment_status: stripeSession.payment_status,
        });
      }
      return NextResponse.json(
        { ok: false, error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Step 3: Find booking by stripeCheckoutSessionId
    const booking = await prisma.booking.findFirst({
      where: {
        stripeCheckoutSessionId: sessionId,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!booking) {
      if (DEBUG_BOOKINGS) {
        console.log('[verify-payment] No booking found for session:', sessionId);
      }
      return NextResponse.json(
        { ok: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (DEBUG_BOOKINGS) {
      console.log('[verify-payment] Booking found:', {
        id: booking.id,
        status: booking.status,
        currentPaymentIntentId: booking.stripePaymentIntentId,
      });
    }

    // Extract payment intent ID
    const paymentIntentId = typeof stripeSession.payment_intent === 'string'
      ? stripeSession.payment_intent
      : stripeSession.payment_intent?.id || null;

    let recovered = false;

    // Step 4: If booking is still PENDING_PAYMENT, update to PENDING_VENDOR_CONFIRMATION
    if (booking.status === 'PENDING_PAYMENT') {
      if (DEBUG_BOOKINGS) {
        console.log('[verify-payment] Recovering stuck booking:', {
          bookingId: booking.id,
          oldStatus: booking.status,
          newStatus: 'PENDING_VENDOR_CONFIRMATION',
          paymentIntentId,
        });
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PENDING_VENDOR_CONFIRMATION',
          stripePaymentIntentId: paymentIntentId,
        },
      });

      recovered = true;

      console.log('[verify-payment] ✅ Successfully recovered booking:', {
        bookingId: booking.id,
        sessionId,
        paymentIntentId,
      });
    } else {
      // Step 5: Ensure payment intent ID is stored even if status is correct
      if (!booking.stripePaymentIntentId && paymentIntentId) {
        if (DEBUG_BOOKINGS) {
          console.log('[verify-payment] Storing payment intent ID:', {
            bookingId: booking.id,
            paymentIntentId,
          });
        }

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            stripePaymentIntentId: paymentIntentId,
          },
        });
      }

      if (DEBUG_BOOKINGS) {
        console.log('[verify-payment] Booking already in correct state:', {
          bookingId: booking.id,
          status: booking.status,
        });
      }
    }

    // Step 6: Fetch updated booking
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!updatedBooking) {
      return NextResponse.json(
        { ok: false, error: 'Failed to retrieve updated booking' },
        { status: 500 }
      );
    }

    // Step 7: Return booking status
    return NextResponse.json({
      ok: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        stripeCheckoutSessionId: updatedBooking.stripeCheckoutSessionId,
        stripePaymentIntentId: updatedBooking.stripePaymentIntentId,
        serviceName: updatedBooking.product.name,
        scheduledDate: updatedBooking.scheduledAt?.toISOString() || '',
        scheduledTime: updatedBooking.preferredTimeWindow || '',
      },
      recovered,
    });

  } catch (error) {
    console.error('[verify-payment] Unexpected error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (DEBUG_BOOKINGS) {
      console.error('[verify-payment] Stack trace:', error);
    }

    return NextResponse.json(
      { ok: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
