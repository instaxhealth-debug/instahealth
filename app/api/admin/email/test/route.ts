import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get('x-cron-secret');

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const to = typeof body?.to === 'string' ? body.to : '';

  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Valid "to" email is required' }, { status: 400 });
  }

  const emailResult = await sendEmail({
    to,
    subject: 'InstaHealth Vendor Application Received',
    html: `
      <h2>Vendor Application Received</h2>
      <p>Your application has been received.</p>
      <p>Our team will review it within 24–48 hours.</p>
    `,
  });

  console.log('[EMAIL_TEST]', {
    requestId,
    to,
    success: emailResult.success,
    error: emailResult.error,
    messageId: emailResult.messageId,
  });

  if (!emailResult.success) {
    return NextResponse.json(
      { success: false, requestId, error: emailResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { success: true, requestId, messageId: emailResult.messageId },
    { status: 200 }
  );
}
