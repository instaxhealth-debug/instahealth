/**
 * GET /api/vendor/session
 *
 * Check if the authenticated user has vendor access.
 * Returns 200 if user has vendor role and is linked to a vendor.
 * Returns 401 if not authenticated.
 * Returns 403 if user is not a vendor or not linked to a vendor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        // Vendor is reverse-related: Vendor.userId points to User.id
        // We need to check if a vendor exists with this user's ID
      },
    });

    if (!user || (user.role as string) !== 'VENDOR') {
      return NextResponse.json(
        { error: 'User is not a vendor' },
        { status: 403 }
      );
    }

    // Check if user is linked to a vendor
    const vendor = await prisma.vendor.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        status: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found for this user' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      userId: user.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      email: vendor.email,
      slug: vendor.slug,
      status: vendor.status,
    });
  } catch (error) {
    console.error('[vendor/session] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
