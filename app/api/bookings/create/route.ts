import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const {
      productId,
      customerName,
      customerEmail,
      customerPhone,
      address,
      notes,
    } = body;

    // Validation
    if (!productId || !customerName || !customerEmail || !customerPhone || !address) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch product with vendor
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { vendor: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Verify product is a service
    const serviceCategories = ["iv-drips", "blood-tests"];
    if (!serviceCategories.includes(product.category)) {
      return NextResponse.json(
        { error: "Product is not a service" },
        { status: 400 }
      );
    }

    // Verify vendor is active
    if (product.vendor.status !== "active") {
      return NextResponse.json(
        { error: "Vendor is not active" },
        { status: 400 }
      );
    }

    // Resolve booking URL
    const bookingUrl = product.bookingUrl || product.vendor.bookingUrl;
    if (!bookingUrl || (!bookingUrl.startsWith("https://") && !bookingUrl.startsWith("http://"))) {
      return NextResponse.json(
        { error: "Invalid booking URL configuration" },
        { status: 400 }
      );
    }

    // Create or fetch address
    let addressRecord;
    if (address.id) {
      // Use existing address
      addressRecord = await prisma.address.findUnique({
        where: { id: address.id },
      });
    } else {
      // Create new address
      const normalizedHash = `${address.lat.toFixed(6)}_${address.lng.toFixed(6)}`;
      
      // Check if address already exists
      addressRecord = await prisma.address.findFirst({
        where: {
          userId: session?.user?.id || undefined,
          normalizedHash,
        },
      });

      if (!addressRecord) {
        const createData: any = {
          label: address.label || "Service Address",
          formattedAddress: address.formattedAddress || address.address,
          placeId: address.placeId || "",
          lat: address.lat,
          lng: address.lng,
          city: address.city || "",
          country: address.country || "United Arab Emirates",
          postalCode: address.postalCode || "",
          normalizedHash,
          line1: address.line1 || address.formattedAddress || address.address,
          line2: address.line2 || null,
          phone: customerPhone,
          emirate: address.emirate || null,
          area: address.area || null,
        };
        
        if (session?.user?.id) {
          createData.userId = session.user.id;
        }

        addressRecord = await prisma.address.create({
          data: createData,
        });
      }
    }

    // Validate service radius if enforced
    if (product.vendor.enforceServiceRadius && product.vendor.baseLat && product.vendor.baseLng && addressRecord) {
      const distance = calculateDistance(
        product.vendor.baseLat,
        product.vendor.baseLng,
        addressRecord.lat,
        addressRecord.lng
      );

      if (distance > product.vendor.serviceRadiusKm) {
        return NextResponse.json(
          { error: `Service address is outside the ${product.vendor.serviceRadiusKm}km service radius` },
          { status: 400 }
        );
      }
    }

    if (!addressRecord) {
      return NextResponse.json(
        { error: "Failed to resolve address" },
        { status: 400 }
      );
    }

    // Create service booking
    const booking = await prisma.serviceBooking.create({
      data: {
        userId: session?.user?.id || null,
        customerName,
        customerEmail,
        customerPhone,
        vendorId: product.vendorId,
        productId: product.id,
        addressId: addressRecord.id,
        amountFils: product.priceFils,
        currency: "aed",
        status: "PAYMENT_PENDING",
        bookingUrlResolved: bookingUrl,
        notes: notes || null,
      },
    });

    return NextResponse.json({ bookingId: booking.id });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

// Haversine formula for distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
