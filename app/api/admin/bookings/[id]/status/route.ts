import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await req.json();
    const bookingId = params.id;

    // Validate status
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "RESCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update booking status
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        product: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      booking,
      message: `Booking status updated to ${status}`,
    });
  } catch (error) {
    console.error("Booking status update error:", error);
    return NextResponse.json(
      { error: "Failed to update booking status" },
      { status: 500 }
    );
  }
}
