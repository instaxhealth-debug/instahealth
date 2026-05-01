import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEBUG_BOOKINGS = process.env.DEBUG_BOOKINGS === "true";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

/**
 * POST /api/bookings/checkout
 *
 * Creates Stripe checkout session for booking payment
 * BULLETPROOF PROTECTION:
 * - Prevents duplicate sessions
 * - Validates booking state
 * - Ensures price consistency
 * - Adds session_id to success URL for recovery
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { bookingId } = body;

    // =========================================
    // VALIDATION
    // =========================================

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { error: "Valid booking ID is required" },
        { status: 400 }
      );
    }

    // Fetch booking with all relations
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        product: {
          select: {
            name: true,
            serviceType: true,
            requiresBooking: true,
          }
        },
        vendor: {
          select: {
            name: true,
            status: true,
          }
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // =========================================
    // CASE A & D: PREVENT DUPLICATE CHECKOUT
    // =========================================

    // If already has a Stripe session, return existing URL
    if (booking.stripeCheckoutSessionId) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          booking.stripeCheckoutSessionId
        );

        // If session is still open or incomplete, reuse it
        if (existingSession.status === "open" || existingSession.payment_status === "unpaid") {
          if (DEBUG_BOOKINGS) {
            console.log("[BOOKING:CHECKOUT] Reusing existing session", {
              bookingId: booking.id,
              sessionId: existingSession.id,
              status: existingSession.status,
            });
          }

          return NextResponse.json({
            url: existingSession.url,
            existingSession: true,
          });
        }
      } catch (err) {
        // Session expired or invalid, continue to create new one
        if (DEBUG_BOOKINGS) {
          console.log("[BOOKING:CHECKOUT] Existing session expired, creating new", {
            bookingId: booking.id,
          });
        }
      }
    }

    // Check booking status
    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        {
          error: `Booking cannot be paid in ${booking.status} status`,
          currentStatus: booking.status,
        },
        { status: 400 }
      );
    }

    // Verify product is still bookable
    if (booking.product.serviceType !== "appointment-service" || !booking.product.requiresBooking) {
      return NextResponse.json(
        { error: "Product is no longer a bookable service" },
        { status: 400 }
      );
    }

    // Verify vendor is still active
    if (booking.vendor.status !== "active") {
      return NextResponse.json(
        { error: "Vendor is no longer accepting bookings" },
        { status: 400 }
      );
    }

    // Verify booking belongs to user (if authenticated)
    if (session?.user?.id && booking.userId && booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to pay for this booking" },
        { status: 403 }
      );
    }

    // =========================================
    // PART 3: PRICE CONSISTENCY
    // =========================================

    // Validate amount is positive
    if (booking.amountFils <= 0) {
      return NextResponse.json(
        { error: "Invalid booking amount" },
        { status: 400 }
      );
    }

    // =========================================
    // CREATE STRIPE SESSION
    // =========================================

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: booking.customerEmail,
      client_reference_id: booking.id,
      line_items: [
        {
          price_data: {
            currency: booking.currency.toLowerCase(),
            unit_amount: booking.amountFils, // Price in fils (already from DB)
            product_data: {
              name: `${booking.product.name} - Service Booking`,
              description: `Appointment with ${booking.vendor.name}`,
            },
          },
          quantity: 1,
        },
      ],
      // CASE B: Add session_id to success URL for payment recovery
      success_url: `${baseUrl}/bookings/success?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/bookings/cancel?bookingId=${booking.id}`,
      metadata: {
        type: "booking",
        bookingId: booking.id,
        vendorId: booking.vendorId,
        productId: booking.productId,
        amountFils: booking.amountFils.toString(),
        ...(session?.user?.id && { userId: session.user.id }),
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });

    // Update booking with Stripe session ID
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        stripeCheckoutSessionId: stripeSession.id,
      },
    });

    if (DEBUG_BOOKINGS) {
      console.log("[BOOKING:CHECKOUT] Stripe session created", {
        bookingId: booking.id,
        sessionId: stripeSession.id,
        amountFils: booking.amountFils,
        expiresAt: stripeSession.expires_at,
      });
    }

    return NextResponse.json({
      url: stripeSession.url,
      sessionId: stripeSession.id,
    });

  } catch (error) {
    console.error("[BOOKING:CHECKOUT] Error:", error);

    if (DEBUG_BOOKINGS) {
      console.error("[BOOKING:CHECKOUT] Stack trace:", error);
    }

    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment system error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
