import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function verifyCronSecret(req: NextRequest): { authorized: boolean; error?: string } {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return { authorized: false, error: 'Server misconfiguration: CRON_SECRET not set.' };
  }
  const provided = req.headers.get('x-cron-secret');
  if (!provided) {
    return { authorized: false, error: 'Unauthorized - x-cron-secret header required' };
  }
  if (!constantTimeCompare(provided, expected)) {
    return { authorized: false, error: 'Unauthorized - invalid cron secret' };
  }
  return { authorized: true };
}

/**
 * GET /api/admin/refunds/summary
 * Returns counts by status + last 20 failures.
 */
export async function GET(req: NextRequest) {
  const verification = verifyCronSecret(req);
  if (!verification.authorized) {
    return NextResponse.json(
      { error: verification.error },
      { status: verification.error?.includes('misconfiguration') ? 500 : 403 }
    );
  }

  try {
    const counts = await prisma.refund.groupBy({
      by: ['status'],
      _count: true,
    });

    const failures = await prisma.refund.findMany({
      where: { status: 'FAILED' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        vendorOrderId: true,
        reason: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      failures,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch refund summary' },
      { status: 500 }
    );
  }
}