/**
 * Vendor Auth Helper
 *
 * Extracts vendor ID from NextAuth session.
 * Prevents x-vendor-id spoofing via headers.
 * Must be called in all vendor-facing routes.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface VendorAuthResult {
  vendorId: string;
  userId: string;
}

/**
 * Require vendor authentication from session.
 * Throws 401 if not authenticated, 403 if user is not linked to a vendor.
 */
export async function requireVendor(): Promise<VendorAuthResult> {
  const session = await auth();

  if (!session || !session.user?.email) {
    throw new Error('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  // Find vendor linked to this user
  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
  });

  if (!vendor) {
    throw new Error('FORBIDDEN');
  }

  if (vendor.status !== 'active') {
    throw new Error('FORBIDDEN');
  }

  return { vendorId: vendor.id, userId: user.id };
}

/**
 * Require admin authentication.
 * Uses x-admin-role header (placeholder until NextAuth roles).
 */
export async function requireAdmin(req: Request): Promise<{ userId: string }> {
  const session = await auth();

  if (!session || !session.user?.email) {
    throw new Error('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }

  return { userId: user.id };
}
