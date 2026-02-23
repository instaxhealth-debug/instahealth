import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorSession } from "@/lib/vendor-auth";

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
    const body = await req.json();
    const { scheduledAt, externalBookingRef } = body;

    if (!scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required" },
        { status: 400 }
      );
    }

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

    if (booking.status !== "PAID_AWAITING_SCHEDULE") {
      return NextResponse.json(
        { error: "Booking is not awaiting schedule" },
        { status: 400 }
      );
    }

    // Update booking
    const updatedBooking = await prisma.serviceBooking.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt: new Date(scheduledAt),
        externalBookingRef: externalBookingRef || null,
      },
    });

    // Send confirmation email to customer (optional)
    try {
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        to: booking.customerEmail,
        subject: "Your appointment has been scheduled",
        html: `
          <h2>Appointment Scheduled</h2>
          <p>Hi ${booking.customerName},</p>
          <p>Your appointment has been scheduled for:</p>
          <p><strong>${new Date(scheduledAt).toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "short",
          })}</strong></p>
          ${externalBookingRef ? `<p>Confirmation reference: ${externalBookingRef}</p>` : ""}
          <p>If you have any questions, please contact the service provider.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send scheduling confirmation email:", emailError);
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Booking schedule error:", error);
    return NextResponse.json(
      { error: "Failed to schedule booking" },
      { status: 500 }
    );
  }
}
