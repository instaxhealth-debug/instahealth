import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Fetch all addresses for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDefault: "desc" }, // Default address first
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("[API] GET /api/my-account/addresses failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

// POST: Create new address
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      label,
      phone,
      line1,
      line2,
      area,
      city,
      emirate,
      instructions,
      lat,
      lng,
      placeId,
      formattedAddress,
      isDefault,
    } = body;

    // Validation
    if (!label?.trim()) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 });
    }
    if (!line1?.trim()) {
      return NextResponse.json(
        { error: "Apartment/Villa & Building is required" },
        { status: 400 }
      );
    }
    if (!city?.trim()) {
      return NextResponse.json({ error: "City is required" }, { status: 400 });
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }
    if (!placeId) {
      return NextResponse.json({ error: "Place ID is required" }, { status: 400 });
    }

    // Generate normalized hash for deduplication
    const normalizedHash = crypto
      .createHash("md5")
      .update(`${lat.toFixed(6)},${lng.toFixed(6)}`)
      .digest("hex");

    // If setting as default, unset all other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        label: label.trim(),
        phone: phone?.trim() || null,
        line1: line1.trim(),
        line2: line2?.trim() || null,
        area: area?.trim() || null,
        city: city.trim(),
        emirate: emirate?.trim() || null,
        country: "United Arab Emirates",
        instructions: instructions?.trim() || null,
        lat,
        lng,
        placeId,
        formattedAddress: formattedAddress || "",
        isDefault: isDefault || false,
        normalizedHash,
      },
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error: any) {
    console.error("[API] POST /api/my-account/addresses failed:", error);
    
    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "This address already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}
