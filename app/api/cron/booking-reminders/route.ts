import { NextRequest, NextResponse } from "next/server";
import { processUnscheduledBookingReminders } from "@/lib/booking-reminders";

/**
 * Cron endpoint for processing unscheduled booking reminders
 *
 * Should be called hourly via:
 * - Vercel Cron (vercel.json)
 * - GitHub Actions workflow
 * - External cron service (with CRON_SECRET auth)
 *
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");

      if (providedSecret !== cronSecret) {
        console.error("[CRON:BOOKING_REMINDERS] Unauthorized: Invalid secret");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("[CRON:BOOKING_REMINDERS] Starting reminder processing...");

    const results = await processUnscheduledBookingReminders();

    console.log("[CRON:BOOKING_REMINDERS] Completed:", results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("[CRON:BOOKING_REMINDERS] Fatal error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
