import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId" },
        { status: 400 }
      );
    }

    // Fetch booking
    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        product: true,
        vendor: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify booking is in correct state
    if (booking.status !== "PAYMENT_PENDING") {
      return NextResponse.json(
        { error: "Booking is not pending payment" },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: booking.currency,
            product_data: {
              name: booking.product.name,
              description: `Service booking with ${booking.vendor.name}`,
            },
            unit_amount: booking.amountFils,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/book/success?bookingId=${booking.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/book/${booking.product.slug}`,
      customer_email: booking.customerEmail,
      metadata: {
        kind: "SERVICE_BOOKING",
        bookingId: booking.id,
        vendorId: booking.vendorId,
        productId: booking.productId,
        addressId: booking.addressId,
      },
    });

    // Save session ID to booking
    await prisma.serviceBooking.update({
      where: { id: booking.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
