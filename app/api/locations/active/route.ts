import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache for 5 minutes (locations rarely change)
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json(locations, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error("[API] /api/locations/active - Database error:", error);
    // Return empty array with 200 to avoid client errors
    // Client must handle empty locations gracefully
    return NextResponse.json([], { status: 200 });
  }
}
