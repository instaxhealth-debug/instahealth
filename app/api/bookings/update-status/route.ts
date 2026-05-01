import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "RESCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, status, scheduledAt } = body;

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: "Missing bookingId or status" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Fetch booking with vendor check
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vendor: { select: { userId: true } } },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check permissions
    const isVendorOwner = booking.vendor.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const isBookingOwner = booking.userId === session.user.id;

    // Users can only cancel their own bookings
    if (isBookingOwner && status !== "CANCELLED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vendors and admins can update any status
    if (!isVendorOwner && !isAdmin && !isBookingOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update booking
    const updateData: any = { status };
    if (scheduledAt) {
      updateData.scheduledAt = new Date(scheduledAt);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    return NextResponse.json({ ok: true, booking: updated });
  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
