import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const locationId = body?.locationId as string | undefined;

    if (!locationId) {
      return NextResponse.json({ ok: false, error: "locationId is required" }, { status: 400 });
    }

    // Verify location exists and is active
    const location = await prisma.location.findFirst({
      where: { id: locationId, isActive: true },
      select: { id: true, name: true, slug: true },
    });

    if (!location) {
      return NextResponse.json({ ok: false, error: "Location not found or inactive" }, { status: 404 });
    }

    // For all users: set cookie for location preference
    const cookieStore = cookies();
    cookieStore.set("selectedLocationId", locationId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    // Persist for logged-in users
    const session = await auth();
    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { defaultLocationId: locationId },
      });
    }

    return NextResponse.json({ ok: true, location });
  } catch (error) {
    console.error("POST /api/location error", error);
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
