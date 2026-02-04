import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const cookieLocationId = cookieStore.get("selectedLocationId")?.value;

    // 1) Cookie if present and active
    if (cookieLocationId) {
      const location = await prisma.location.findFirst({
        where: { id: cookieLocationId, isActive: true },
        select: { id: true, name: true, slug: true },
      });
      if (location) {
        return NextResponse.json(location, { status: 200 });
      }
    }

    // 2) User default if logged in
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          defaultLocation: {
            select: { id: true, name: true, slug: true, isActive: true },
          },
        },
      });
      if (user?.defaultLocation && user.defaultLocation.isActive) {
        const { isActive, ...location } = user.defaultLocation;
        return NextResponse.json(location, { status: 200 });
      }
    }

    // 3) Fallback to first active location
    const fallback = await prisma.location.findFirst({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    if (fallback) {
      return NextResponse.json(fallback, { status: 200 });
    }

    // No locations found - return null with 200
    return NextResponse.json(null, { status: 200 });
  } catch (error) {
    console.error("[API] /api/locations/selected - Database error:", error);
    // Return null with 200 to avoid client errors
    return NextResponse.json(null, { status: 200 });
  }
}
