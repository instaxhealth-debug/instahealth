/**
 * MARKETPLACE: Real-Time Slot Generation System
 *
 * Generates available booking time slots based on:
 * - Vendor working hours
 * - Existing bookings (prevents overlaps)
 * - Slot duration
 * - Buffer time between appointments
 */

import { prisma } from "@/lib/prisma";

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  formattedTime: string; // "10:00 AM - 11:00 AM"
}

export interface GenerateSlotOptions {
  vendorId: string;
  productId: string;
  date: Date; // Target date
  daysAhead?: number; // How many days to show (default: 7)
}

/**
 * Parse HH:mm time string to hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Format time slot for display
 */
function formatTimeSlot(start: Date, end: Date): string {
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return `${formatTime(start)} - ${formatTime(end)}`;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Generate available time slots for a specific date
 */
export async function generateTimeSlots(
  options: GenerateSlotOptions
): Promise<TimeSlot[]> {
  const { vendorId, productId, date } = options;

  // Fetch vendor settings
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      workingDays: true,
      workingHoursStart: true,
      workingHoursEnd: true,
      slotDurationMinutes: true,
      bufferTimeMinutes: true,
    },
  });

  if (!vendor) {
    throw new Error("Vendor not found");
  }

  // Fetch product for duration override
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      durationMinutes: true,
    },
  });

  // Extract vendor settings with defaults
  const workingDays = vendor.workingDays || [1, 2, 3, 4, 5, 6, 0]; // Default: all days
  const workingHoursStart = vendor.workingHoursStart || "09:00";
  const workingHoursEnd = vendor.workingHoursEnd || "18:00";
  const slotDuration = product?.durationMinutes || vendor.slotDurationMinutes || 60;
  const bufferTime = vendor.bufferTimeMinutes || 15;

  // Check if vendor works on this day (0 = Sunday, 6 = Saturday)
  const dayOfWeek = date.getDay();
  if (!workingDays.includes(dayOfWeek)) {
    return []; // Vendor doesn't work on this day
  }

  // Parse working hours
  const startTime = parseTime(workingHoursStart);
  const endTime = parseTime(workingHoursEnd);

  // Create start and end datetime for this date
  const workDayStart = new Date(date);
  workDayStart.setHours(startTime.hours, startTime.minutes, 0, 0);

  const workDayEnd = new Date(date);
  workDayEnd.setHours(endTime.hours, endTime.minutes, 0, 0);

  // Fetch existing bookings for this vendor on this date
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existingBookings = await prisma.booking.findMany({
    where: {
      vendorId,
      scheduledStart: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: ["PENDING_VENDOR_CONFIRMATION", "CONFIRMED", "IN_PROGRESS"],
      },
    },
    select: {
      scheduledStart: true,
      scheduledEnd: true,
    },
  });

  // Generate all possible slots
  const slots: TimeSlot[] = [];
  let currentSlotStart = new Date(workDayStart);

  while (currentSlotStart < workDayEnd) {
    const currentSlotEnd = new Date(
      currentSlotStart.getTime() + slotDuration * 60 * 1000
    );

    // Check if slot end exceeds working hours
    if (currentSlotEnd > workDayEnd) {
      break;
    }

    // Check if slot overlaps with any existing booking
    let available = true;
    for (const booking of existingBookings) {
      if (
        booking.scheduledStart &&
        booking.scheduledEnd &&
        timeRangesOverlap(
          currentSlotStart,
          currentSlotEnd,
          new Date(booking.scheduledStart),
          new Date(booking.scheduledEnd)
        )
      ) {
        available = false;
        break;
      }
    }

    // Check if slot is in the past
    if (currentSlotStart < new Date()) {
      available = false;
    }

    slots.push({
      start: new Date(currentSlotStart),
      end: new Date(currentSlotEnd),
      available,
      formattedTime: formatTimeSlot(currentSlotStart, currentSlotEnd),
    });

    // Move to next slot (duration + buffer)
    currentSlotStart = new Date(
      currentSlotStart.getTime() + (slotDuration + bufferTime) * 60 * 1000
    );
  }

  return slots;
}

/**
 * Generate slots for multiple days ahead
 */
export async function generateMultiDaySlots(
  options: GenerateSlotOptions
): Promise<Record<string, TimeSlot[]>> {
  const { date, daysAhead = 7 } = options;
  const slotsByDay: Record<string, TimeSlot[]> = {};

  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() + i);

    const dateKey = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
    slotsByDay[dateKey] = await generateTimeSlots({
      ...options,
      date: targetDate,
    });
  }

  return slotsByDay;
}

/**
 * Calculate platform commission for a booking
 */
export function calculateMarketplaceFees(
  totalPriceFils: number
): {
  totalPriceFils: number;
  platformFeeFils: number;
  vendorPayoutFils: number;
} {
  const platformFeePercent = parseFloat(
    process.env.PLATFORM_FEE_PERCENT || "0.20"
  );

  const platformFeeFils = Math.round(totalPriceFils * platformFeePercent);
  const vendorPayoutFils = totalPriceFils - platformFeeFils;

  return {
    totalPriceFils,
    platformFeeFils,
    vendorPayoutFils,
  };
}
