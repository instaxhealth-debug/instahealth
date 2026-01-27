import type { BookingSlot, IVService, BloodTest } from "@/types";

// Abstracted booking provider interface
// Compatible with Acuity, Calendly, or custom booking systems

interface BookingProvider {
  getAvailableSlots(
    itemId: string,
    itemType: "service" | "test",
    date: Date,
    location?: { latitude: number; longitude: number }
  ): Promise<BookingSlot[]>;
  createBooking(
    itemId: string,
    itemType: "service" | "test",
    slotId: string,
    userId: string,
    addressId: string
  ): Promise<{ bookingId: string; paymentUrl?: string }>;
}

// Placeholder implementation
// Replace with actual booking provider integration
class PlaceholderBookingProvider implements BookingProvider {
  async getAvailableSlots(
    itemId: string,
    itemType: "service" | "test",
    date: Date,
    location?: { latitude: number; longitude: number }
  ): Promise<BookingSlot[]> {
    // TODO: Integrate with Acuity/Calendly API
    // For now, return empty array
    return [];
  }

  async createBooking(
    itemId: string,
    itemType: "service" | "test",
    slotId: string,
    userId: string,
    addressId: string
  ): Promise<{ bookingId: string; paymentUrl?: string }> {
    // TODO: Create booking via provider API
    return {
      bookingId: `booking-${Date.now()}`,
      paymentUrl: undefined,
    };
  }
}

export const bookingProvider: BookingProvider = new PlaceholderBookingProvider();

export async function getServices(): Promise<IVService[]> {
  // TODO: Fetch from booking API or CMS
  return [];
}

export async function getServiceBySlug(slug: string): Promise<IVService | null> {
  // TODO: Fetch from booking API or CMS
  return null;
}

export async function getTests(): Promise<BloodTest[]> {
  // TODO: Fetch from booking API or CMS
  return [];
}

export async function getTestBySlug(slug: string): Promise<BloodTest | null> {
  // TODO: Fetch from booking API or CMS
  return null;
}

