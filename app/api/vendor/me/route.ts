import { NextRequest, NextResponse } from "next/server";
import { getVendorContext, validateImageUrl } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { isValidBookingUrl } from "@/lib/vendor-categories";

export async function PATCH(req: NextRequest) {
  try {
    const vendor = await getVendorContext();
    const body = await req.json();

    let { logoUrl, tagline, bookingUrl, serviceRadiusKm, enforceServiceRadius, allowOutOfRadiusOverride } = body;

    // Validate logoUrl if provided
    if (logoUrl !== undefined && logoUrl !== null) {
      const validation = validateImageUrl(logoUrl);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      if (validation.normalizedUrl) {
        logoUrl = validation.normalizedUrl;
      }
    }

    // Validate bookingUrl if provided
    if (bookingUrl !== undefined && bookingUrl !== null && bookingUrl !== "") {
      if (!isValidBookingUrl(bookingUrl)) {
        return NextResponse.json(
          { error: "Booking URL must be a valid Calendly, Acuity, Fresha, Square, or HTTPS link" },
          { status: 400 }
        );
      }
    }

    // Validate serviceRadiusKm
    if (serviceRadiusKm !== undefined) {
      const radius = parseInt(serviceRadiusKm);
      if (isNaN(radius) || radius < 1 || radius > 200) {
        return NextResponse.json(
          { error: "Service radius must be between 1 and 200 km" },
          { status: 400 }
        );
      }
    }

    // Build update data - only include fields that were provided
    const updateData: any = {};

    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (tagline !== undefined) updateData.tagline = tagline || null;
    if (bookingUrl !== undefined) updateData.bookingUrl = bookingUrl || null;
    if (serviceRadiusKm !== undefined) updateData.serviceRadiusKm = parseInt(serviceRadiusKm);
    if (enforceServiceRadius !== undefined) updateData.enforceServiceRadius = enforceServiceRadius;
    if (allowOutOfRadiusOverride !== undefined) updateData.allowOutOfRadiusOverride = allowOutOfRadiusOverride;

    // Update vendor record
    const updated = await prisma.vendor.update({
      where: { id: vendor.vendorId },
      data: updateData,
    });

    console.log("[VENDOR_SETTINGS_UPDATE] ✓ Settings updated", {
      vendorId: vendor.vendorId,
      updatedFields: Object.keys(updateData),
    });

    return NextResponse.json({
      success: true,
      vendor: {
        id: updated.id,
        logoUrl: updated.logoUrl,
        tagline: updated.tagline,
        bookingUrl: updated.bookingUrl,
        serviceRadiusKm: updated.serviceRadiusKm,
        enforceServiceRadius: updated.enforceServiceRadius,
        allowOutOfRadiusOverride: updated.allowOutOfRadiusOverride,
      },
    });
  } catch (error: any) {
    console.error("[VENDOR_SETTINGS_UPDATE] Error:", error);
    return NextResponse.json(
      { error: "Failed to update vendor settings" },
      { status: 500 }
    );
  }
}
