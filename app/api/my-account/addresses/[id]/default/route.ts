import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Set address as default
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Use transaction to ensure atomicity
    await prisma.$transaction([
      // Unset all defaults
      prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      }),
      // Set this address as default
      prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] POST /api/my-account/addresses/[id]/default failed:", error);
    return NextResponse.json(
      { error: "Failed to set default address" },
      { status: 500 }
    );
  }
}
