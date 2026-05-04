import { NextRequest, NextResponse } from "next/server";
import {
  generateTimeSlots,
  generateMultiDaySlots,
} from "@/lib/time-slot-generator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/bookings/slots
 *
 * Generate available time slots for booking
 *
 * Query params:
 * - vendorId: string (required)
 * - productId: string (required)
 * - date: string (YYYY-MM-DD) (required)
 * - multiDay: boolean (optional, returns 7 days if true)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const vendorId = searchParams.get("vendorId");
    const productId = searchParams.get("productId");
    const dateStr = searchParams.get("date");
    const multiDay = searchParams.get("multiDay") === "true";

    // Validation
    if (!vendorId || !productId || !dateStr) {
      return NextResponse.json(
        {
          error: "Missing required parameters: vendorId, productId, date",
        },
        { status: 400 }
      );
    }

    // Parse date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Prevent booking in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return NextResponse.json(
        { error: "Cannot book appointments in the past" },
        { status: 400 }
      );
    }

    // Generate slots
    if (multiDay) {
      const slotsByDay = await generateMultiDaySlots({
        vendorId,
        productId,
        date,
        daysAhead: 7,
      });

      return NextResponse.json({
        ok: true,
        slotsByDay,
      });
    } else {
      const slots = await generateTimeSlots({
        vendorId,
        productId,
        date,
      });

      return NextResponse.json({
        ok: true,
        date: dateStr,
        slots,
      });
    }
  } catch (error) {
    console.error("[SLOTS:GENERATE] Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate time slots",
      },
      { status: 500 }
    );
  }
}
