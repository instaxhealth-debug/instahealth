import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ addresses });
  } catch (error: any) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { label, formattedAddress, placeId, latitude, longitude } = body;

    // Validate inputs
    if (!label || typeof label !== "string") {
      return NextResponse.json(
        { error: "label is required" },
        { status: 400 }
      );
    }

    if (!formattedAddress || typeof formattedAddress !== "string") {
      return NextResponse.json(
        { error: "formattedAddress is required" },
        { status: 400 }
      );
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Create normalized hash for deduplication
    const crypto = require("crypto");
    const hashInput = `${latitude.toFixed(4)}-${longitude.toFixed(4)}`;
    const normalizedHash = crypto
      .createHash("sha256")
      .update(hashInput)
      .digest("hex");

    // Check if address already exists for this user (dedupe by normalizedHash)
    const existing = await prisma.address.findFirst({
      where: {
        userId: user.id,
        normalizedHash,
      },
    });

    if (existing) {
      // Return existing address instead of creating duplicate
      return NextResponse.json({ address: existing, isExisting: true });
    }

    // Create new address
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        label,
        formattedAddress,
        placeId: placeId || null,
        lat: latitude,
        lng: longitude,
        city: null,
        state: null,
        country: null,
        postalCode: null,
        normalizedHash,
      },
    });

    return NextResponse.json({ address, isExisting: false });
  } catch (error: any) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create address" },
      { status: 500 }
    );
  }
}
