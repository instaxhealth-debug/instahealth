import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT: Update address
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const addressId = params.id;

    // Verify address belongs to user
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress || existingAddress.userId !== user.id) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
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

    // Generate normalized hash
    const normalizedHash = crypto
      .createHash("md5")
      .update(`${lat.toFixed(6)},${lng.toFixed(6)}`)
      .digest("hex");

    // If setting as default, unset all other defaults
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: {
        label: label.trim(),
        phone: phone?.trim() || null,
        line1: line1.trim(),
        line2: line2?.trim() || null,
        area: area?.trim() || null,
        city: city.trim(),
        emirate: emirate?.trim() || null,
        instructions: instructions?.trim() || null,
        lat,
        lng,
        placeId,
        formattedAddress: formattedAddress || "",
        isDefault: isDefault || false,
        normalizedHash,
      },
    });

    return NextResponse.json({ address: updatedAddress });
  } catch (error: any) {
    console.error("[API] PUT /api/my-account/addresses/[id] failed:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "This address already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

// DELETE: Delete address
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const addressId = params.id;

    // Verify address belongs to user
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress || existingAddress.userId !== user.id) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/my-account/addresses/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
