import { NextRequest, NextResponse } from 'next/server';
import { enforceSLA, getSLAStatus } from '@/lib/fulfillment/sla-enforcement';

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Verify CRON_SECRET is configured and matches request header
 */
function verifyCronSecret(req: NextRequest): { authorized: boolean; error?: string } {
  const expectedCronSecret = process.env.CRON_SECRET;
  
  // CRITICAL: CRON_SECRET must be configured
  if (!expectedCronSecret) {
    return {
      authorized: false,
      error: 'Server misconfiguration: CRON_SECRET not set. Contact admin.',
    };
  }
  
  const providedSecret = req.headers.get('x-cron-secret');
  
  if (!providedSecret) {
    return {
      authorized: false,
      error: 'Unauthorized - x-cron-secret header required',
    };
  }
  
  // Use constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(providedSecret, expectedCronSecret)) {
    return {
      authorized: false,
      error: 'Unauthorized - invalid cron secret',
    };
  }
  
  return { authorized: true };
}

/**
 * GET /api/admin/sla/status
 * View current SLA status for all pending vendor orders
 * Requires CRON_SECRET for production access
 */
export async function GET(req: NextRequest) {
  try {
    const verification = verifyCronSecret(req);
    
    if (!verification.authorized) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.error?.includes('misconfiguration') ? 500 : 403 }
      );
    }

    const status = await getSLAStatus();

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Get SLA status failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get SLA status',
      },
      { status: 400 }
    );
  }
}

/**
 * POST /api/admin/sla/enforce
 * Trigger SLA enforcement (auto-cancel expired vendor orders)
 * 
 * CRITICAL SECURITY: Only callable by cron jobs with valid CRON_SECRET
 * NO vendor or public access allowed
 * NEVER accepts vendor sessions
 */
export async function POST(req: NextRequest) {
  try {
    const verification = verifyCronSecret(req);
    
    if (!verification.authorized) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.error?.includes('misconfiguration') ? 500 : 403 }
      );
    }

    const result = await enforceSLA();

    return NextResponse.json({
      success: true,
      result: {
        expiredOrderIds: result.expiredOrderIds,
        cancelledCount: result.cancelledCount,
        processedCount: result.processedCount,
        skippedCount: result.skippedCount,
        refundedCount: result.refundCount,
        failures: result.errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] SLA enforcement failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'SLA enforcement failed',
      },
      { status: 500 }
    );
  }
}
