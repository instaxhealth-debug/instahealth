// Mock data for bloodz/ivz booking systems (NOT marketplace)
// These are separate booking flows and not part of marketplace vendor system
import type { Product, IVService, BloodTest } from "@/types";

export const mockProducts: Product[] = [];

export const mockIVServices: IVService[] = [];

export const mockBloodTests: BloodTest[] = [];

// Availability helpers
export function getNextDeliveryTime(): { available: boolean; message: string } {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 18) {
    return { available: true, message: "Delivery today" };
  }
  return { available: true, message: "Next-day delivery" };
}

export function getNextBookingSlot(): { available: boolean; message: string } {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 14) {
    return { available: true, message: "Today at 2:00 PM" };
  }
  return { available: true, message: "Tomorrow at 10:00 AM" };
}

export function getNextCollectionSlot(): { available: boolean; message: string } {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 12) {
    return { available: true, message: "Today at 12:00 PM" };
  }
  return { available: true, message: "Tomorrow at 10:00 AM" };
}
