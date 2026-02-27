/**
 * Booking Reminder System for Unscheduled Bookings
 *
 * Handles automated reminders for bookings stuck in PAID_AWAITING_SCHEDULE
 * - 24 hours: Send reminder to customer and vendor
 * - 72 hours: Flag for admin review / enable refund request
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export interface UnscheduledBooking {
  id: string;
  hoursUnscheduled: number;
  customerEmail: string;
  customerName: string;
  vendor: {
    name: string;
    email: string | null;
  };
  product: {
    name: string;
  };
  bookingUrlResolved: string | null;
  amountFils: number;
}

/**
 * Find bookings that have been in PAID_AWAITING_SCHEDULE for more than threshold hours
 */
export async function findUnscheduledBookings(
  thresholdHours: number
): Promise<UnscheduledBooking[]> {
  const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

  const bookings = await prisma.serviceBooking.findMany({
    where: {
      status: "PAID_AWAITING_SCHEDULE",
      updatedAt: {
        lte: thresholdDate,
      },
    },
    include: {
      vendor: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  return bookings.map((booking) => {
    const hoursUnscheduled = Math.floor(
      (Date.now() - booking.updatedAt.getTime()) / (1000 * 60 * 60)
    );

    return {
      id: booking.id,
      hoursUnscheduled,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      vendor: {
        name: booking.vendor.name,
        email: booking.vendor.email,
      },
      product: {
        name: booking.product.name,
      },
      bookingUrlResolved: booking.bookingUrlResolved,
      amountFils: booking.amountFils,
    };
  });
}

/**
 * Send 24-hour reminder to customer
 */
export async function send24HourCustomerReminder(
  booking: UnscheduledBooking
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  await sendEmail({
    to: booking.customerEmail,
    subject: `Reminder: Complete Your Booking for ${booking.product.name}`,
    html: `
      <h2>Reminder: Complete Your Booking</h2>
      <p>Hi ${booking.customerName},</p>

      <p>We noticed you haven't scheduled your exact time slot yet for your booking:</p>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Service:</strong> ${booking.product.name}<br>
        <strong>Provider:</strong> ${booking.vendor.name}<br>
        <strong>Amount Paid:</strong> AED ${(booking.amountFils / 100).toFixed(2)}
      </div>

      <p><strong>Next Step:</strong> Please click the button below to select your appointment time.</p>

      ${
        booking.bookingUrlResolved
          ? `<div style="margin: 30px 0;">
              <a href="${booking.bookingUrlResolved}"
                 style="background: #2563eb; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Schedule Your Appointment
              </a>
            </div>`
          : ""
      }

      <p><strong>Important:</strong> Please complete your scheduling within the next 48 hours. If you're unable to schedule, you can request a full refund.</p>

      <p>Questions? Reply to this email or contact ${booking.vendor.name} directly.</p>

      <p>Booking ID: ${booking.id}</p>
    `,
  });

  console.log(`[BOOKING_REMINDER] 24h reminder sent to customer: ${booking.id}`);
}

/**
 * Send 24-hour reminder to vendor
 */
export async function send24HourVendorReminder(
  booking: UnscheduledBooking
): Promise<void> {
  if (!booking.vendor.email) {
    console.log(
      `[BOOKING_REMINDER] No vendor email for booking ${booking.id}, skipping vendor reminder`
    );
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const portalUrl = `${baseUrl}/vendor/bookings/${booking.id}`;

  await sendEmail({
    to: booking.vendor.email,
    subject: `Action Required: Unscheduled Booking for ${booking.product.name}`,
    html: `
      <h2>Unscheduled Booking Alert</h2>
      <p>A customer has not yet scheduled their appointment for a booking paid 24 hours ago:</p>

      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <strong>Service:</strong> ${booking.product.name}<br>
        <strong>Customer:</strong> ${booking.customerName}<br>
        <strong>Email:</strong> ${booking.customerEmail}<br>
        <strong>Amount:</strong> AED ${(booking.amountFils / 100).toFixed(2)}<br>
        <strong>Hours Unscheduled:</strong> ${booking.hoursUnscheduled}
      </div>

      <p><strong>Action Required:</strong> Please reach out to the customer to help them schedule their appointment.</p>

      <div style="margin: 30px 0;">
        <a href="${portalUrl}"
           style="background: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          View in Vendor Portal
        </a>
      </div>

      <p>If the customer cannot be reached within 72 hours, the booking will be flagged for admin review.</p>

      <p>Booking ID: ${booking.id}</p>
    `,
  });

  console.log(`[BOOKING_REMINDER] 24h reminder sent to vendor: ${booking.id}`);
}

/**
 * Send 72-hour alert to admin and flag booking
 */
export async function send72HourAdminAlert(
  booking: UnscheduledBooking
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NOTIFICATION_EMAIL;

  if (!adminEmail) {
    console.error(
      `[BOOKING_REMINDER] No admin email configured for 72h alert: ${booking.id}`
    );
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const bookingUrl = `${baseUrl}/admin/bookings/${booking.id}`;

  await sendEmail({
    to: adminEmail,
    subject: `🚨 Escalation: Booking Unscheduled for 72+ Hours`,
    html: `
      <h2>Booking Escalation Required</h2>
      <p>The following booking has been in PAID_AWAITING_SCHEDULE for over 72 hours:</p>

      <div style="background: #fee; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <strong>Booking ID:</strong> ${booking.id}<br>
        <strong>Service:</strong> ${booking.product.name}<br>
        <strong>Provider:</strong> ${booking.vendor.name}<br>
        <strong>Customer:</strong> ${booking.customerName}<br>
        <strong>Email:</strong> ${booking.customerEmail}<br>
        <strong>Amount:</strong> AED ${(booking.amountFils / 100).toFixed(2)}<br>
        <strong>Hours Unscheduled:</strong> ${booking.hoursUnscheduled}
      </div>

      <p><strong>Recommended Actions:</strong></p>
      <ul>
        <li>Contact customer and vendor to facilitate scheduling</li>
        <li>If scheduling cannot be completed, process refund</li>
        <li>Review vendor booking URL for issues</li>
      </ul>

      <div style="margin: 30px 0;">
        <a href="${bookingUrl}"
           style="background: #dc3545; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Review Booking
        </a>
      </div>

      <p>This booking requires manual intervention.</p>
    `,
  });

  console.log(`[BOOKING_REMINDER] 72h admin alert sent for booking: ${booking.id}`);
}

/**
 * Process all unscheduled bookings for reminders
 * Should be run as a cron job (e.g., hourly)
 */
export async function processUnscheduledBookingReminders(): Promise<{
  reminders24h: number;
  alerts72h: number;
  errors: number;
}> {
  const results = {
    reminders24h: 0,
    alerts72h: 0,
    errors: 0,
  };

  try {
    // Find bookings >= 24 hours old
    const bookings24h = await findUnscheduledBookings(24);
    const bookings72h = await findUnscheduledBookings(72);

    // Process 24-hour reminders (exclude those already past 72h)
    const only24h = bookings24h.filter(
      (b) => !bookings72h.find((b72) => b72.id === b.id)
    );

    for (const booking of only24h) {
      try {
        await send24HourCustomerReminder(booking);
        await send24HourVendorReminder(booking);
        results.reminders24h++;
      } catch (error) {
        console.error(
          `[BOOKING_REMINDER] Error sending 24h reminder for ${booking.id}:`,
          error
        );
        results.errors++;
      }
    }

    // Process 72-hour escalations
    for (const booking of bookings72h) {
      try {
        await send72HourAdminAlert(booking);
        results.alerts72h++;
      } catch (error) {
        console.error(
          `[BOOKING_REMINDER] Error sending 72h alert for ${booking.id}:`,
          error
        );
        results.errors++;
      }
    }

    console.log(
      `[BOOKING_REMINDER] Processed reminders: 24h=${results.reminders24h}, 72h=${results.alerts72h}, errors=${results.errors}`
    );
  } catch (error) {
    console.error("[BOOKING_REMINDER] Fatal error processing reminders:", error);
    results.errors++;
  }

  return results;
}
