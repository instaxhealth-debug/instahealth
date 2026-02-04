"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface UpdatePersonalDetailsInput {
  name: string;
  countryCode: string;
  mobileNumber: string;
  email: string;
}

export interface UpdatePersonalDetailsResult {
  success: boolean;
  error?: string;
}

export async function updatePersonalDetails(
  data: UpdatePersonalDetailsInput
): Promise<UpdatePersonalDetailsResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate input
    if (!data.name?.trim()) {
      return { success: false, error: "Name is required" };
    }

    if (!data.countryCode) {
      return { success: false, error: "Country code is required" };
    }

    if (!data.mobileNumber?.trim()) {
      return { success: false, error: "Mobile number is required" };
    }

    // Basic mobile number validation (digits only, reasonable length)
    const cleanMobile = data.mobileNumber.replace(/\s+/g, "");
    if (!/^\d{7,15}$/.test(cleanMobile)) {
      return {
        success: false,
        error: "Invalid mobile number format (7-15 digits)",
      };
    }

    // Email validation
    if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { success: false, error: "Invalid email address" };
    }

    // Construct E.164 phone format
    const phone = `${data.countryCode}${cleanMobile}`;

    // Update user in database
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: data.name.trim(),
        phone,
        countryCode: data.countryCode,
        email: data.email.trim(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating personal details:", error);
    return {
      success: false,
      error: "Failed to update personal details. Please try again.",
    };
  }
}
