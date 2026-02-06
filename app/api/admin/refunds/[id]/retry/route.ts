import { NextRequest, NextResponse } from 'next/server';
import { retryRefund } from '@/lib/payments/refunds';

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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const verification = verifyCronSecret(req);
  if (!verification.authorized) {
    return NextResponse.json(
      { error: verification.error },
      { status: verification.error?.includes('misconfiguration') ? 500 : 403 }
    );
  }

  try {
    const refundId = params.id;
    const updated = await retryRefund(refundId, 'SYSTEM', 'system');

    return NextResponse.json({
      success: true,
      refund: {
        id: updated.id,
        status: updated.status,
        stripeRefundId: updated.stripeRefundId,
        amountFils: updated.amountFils,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refund retry failed' },
      { status: 400 }
    );
  }
}