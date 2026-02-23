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

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.amountFils,
      currency: booking.currency,
      metadata: {
        kind: "SERVICE_BOOKING",
        bookingId: booking.id,
        vendorId: booking.vendorId,
        productId: booking.productId,
        addressId: booking.addressId,
      },
      description: `${booking.product.name} - ${booking.vendor.name}`,
    });

    // Save payment intent ID to booking
    await prisma.serviceBooking.update({
      where: { id: booking.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment intent creation error:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
