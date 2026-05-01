import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const DEBUG_BOOKINGS = process.env.DEBUG_BOOKINGS === "true";

/**
 * POST /api/bookings/new
 *
 * Creates a new booking with comprehensive validation
 * BULLETPROOF PROTECTION:
 * - Data integrity validation
 * - Price consistency checks
 * - Double booking prevention
 * - Vendor/product verification
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const {
      productId,
      variantId,
      customerName,
      customerEmail,
      customerPhone,
      address,
      preferredDate,
      preferredTimeWindow,
      notes,
    } = body;

    // =========================================
    // PART 2: DATA INTEGRITY VALIDATION
    // =========================================

    // Required fields
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json(
        { error: "Customer name is required (minimum 2 characters)" },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    if (!customerPhone) {
      return NextResponse.json(
        { error: "Customer phone is required" },
        { status: 400 }
      );
    }

    if (!address || address.trim().length < 10) {
      return NextResponse.json(
        { error: "Full address is required (minimum 10 characters)" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Phone validation (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
    if (!phoneRegex.test(customerPhone)) {
      return NextResponse.json(
        { error: "Invalid phone format (minimum 8 digits)" },
        { status: 400 }
      );
    }

    // =========================================
    // PART 3: PRICE CONSISTENCY CHECK
    // =========================================

    // Fetch product with vendor and variants
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: true,
        variants: true
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Verify product is an appointment service
    if (product.serviceType !== "appointment-service" || !product.requiresBooking) {
      return NextResponse.json(
        { error: "Product is not a bookable service" },
        { status: 400 }
      );
    }

    // Verify product is active and published
    if (!product.active || !product.published) {
      return NextResponse.json(
        { error: "Product is not available for booking" },
        { status: 400 }
      );
    }

    // Verify vendor is active
    if (product.vendor.status !== "active") {
      return NextResponse.json(
        { error: "Vendor is not currently accepting bookings" },
        { status: 400 }
      );
    }

    // Calculate price - ALWAYS from database, NEVER from client
    let amountFils = product.priceFils;
    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        return NextResponse.json(
          { error: "Invalid variant selected" },
          { status: 400 }
        );
      }
      amountFils = variant.priceFils;
    }

    // Validate price is positive
    if (amountFils <= 0) {
      return NextResponse.json(
        { error: "Invalid product price" },
        { status: 400 }
      );
    }

    // =========================================
    // PART 4: DOUBLE BOOKING PREVENTION
    // =========================================

    // Check for duplicate bookings in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentBooking = await prisma.booking.findFirst({
      where: {
        productId: product.id,
        customerEmail: customerEmail.toLowerCase(),
        createdAt: {
          gte: fiveMinutesAgo,
        },
        status: {
          in: ["PENDING_PAYMENT", "PENDING_VENDOR_CONFIRMATION", "CONFIRMED"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (recentBooking) {
      return NextResponse.json(
        {
          error: "You recently booked this service. Please wait 5 minutes before booking again or complete your existing booking.",
          existingBookingId: recentBooking.id,
        },
        { status: 409 }
      );
    }

    // =========================================
    // CREATE BOOKING
    // =========================================

    const booking = await prisma.booking.create({
      data: {
        userId: session?.user?.id || null,
        vendorId: product.vendorId,
        productId: product.id,
        variantId: variantId || null,
        status: "PENDING_PAYMENT",
        customerName: customerName.trim(),
        customerEmail: customerEmail.toLowerCase().trim(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTimeWindow: preferredTimeWindow?.trim() || null,
        notes: notes?.trim() || null,
        amountFils, // Always from database
        currency: "AED",
      },
    });

    if (DEBUG_BOOKINGS) {
      console.log("[BOOKING:CREATE] Created successfully", {
        bookingId: booking.id,
        status: booking.status,
        amountFils: booking.amountFils,
        productId: booking.productId,
        vendorId: booking.vendorId,
      });
    }

    return NextResponse.json({
      ok: true,
      booking: {
        id: booking.id,
        amountFils: booking.amountFils,
        currency: booking.currency,
      },
    });

  } catch (error) {
    console.error("[BOOKING:CREATE] Error:", error);

    if (DEBUG_BOOKINGS) {
      console.error("[BOOKING:CREATE] Stack trace:", error);
    }

    return NextResponse.json(
      { error: "Failed to create booking. Please try again." },
      { status: 500 }
    );
  }
}
