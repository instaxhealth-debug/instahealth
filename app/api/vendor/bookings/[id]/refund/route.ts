import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorSession } from "@/lib/vendor-auth";
import { issueServiceBookingRefund } from "@/lib/payments/refunds";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getVendorSession();

    if (!session?.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Fetch booking and verify ownership
    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.vendorId !== session.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Issue refund using centralized function
    const result = await issueServiceBookingRefund(id);

    // Send refund confirmation email
    try {
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        to: booking.customerEmail,
        subject: "Refund processed for your booking",
        html: `
          <h2>Refund Processed</h2>
          <p>Hi ${booking.customerName},</p>
          <p>Your booking has been refunded. The amount of AED ${(booking.amountFils / 100).toFixed(2)} will be returned to your original payment method within 5-10 business days.</p>
          <p>Booking ID: ${booking.id}</p>
          <p>If you have any questions, please contact support.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send refund email:", emailError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Booking refund error:", error);
    return NextResponse.json(
      {
        error: "Failed to process refund",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
