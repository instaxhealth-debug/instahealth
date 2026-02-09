import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendVendorInviteEmail } from '@/lib/email';
import { createHash, randomUUID } from 'crypto';
import { getBaseUrl, redactToken } from '@/lib/url';

export async function POST(request: NextRequest) {
  try {
    const requestId = randomUUID();
    // Check authentication and admin role
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId required' },
        { status: 400 }
      );
    }

    // Fetch application
    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Application must be in PENDING status' },
        { status: 400 }
      );
    }

    const rawToken = randomUUID();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const inviteToken = await prisma.vendorInvite.create({
      data: {
        applicationId: application.id,
        email: application.contactEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
    });

    // Generate invite link
    const baseUrl = getBaseUrl({ requestId, route: "/api/admin/vendor/invite" });
    const inviteLink = `${baseUrl}/vendor/activate?token=${rawToken}`;

    // Send invite email
    const emailResult = await sendVendorInviteEmail(
      application.contactEmail,
      application.legalBusinessName,
      inviteLink
    );

    console.log('[VENDOR_INVITE_EMAIL]', {
      requestId,
      applicationId: application.id,
      inviteId: inviteToken.id,
      email: inviteToken.email,
      emailSuccess: emailResult.success,
      emailError: emailResult.error,
      emailMessageId: emailResult.messageId || null,
      adminUserId: user.id,
      baseUrl,
      inviteLink: redactToken(inviteLink),
    });

    if (!emailResult.success) {
      console.error('[VENDOR_INVITE]', {
        requestId,
        applicationId: application.id,
        email: application.contactEmail,
        emailSuccess: false,
        emailError: emailResult.error,
      });
      return NextResponse.json(
        { error: 'Failed to send invite email' },
        { status: 500 }
      );
    }

    // Mark application as approved
    await prisma.vendorApplication.update({
      where: { id: application.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: user.id,
        notes: `Invite sent to ${application.contactEmail}`,
      },
    });

    console.log('[VENDOR_INVITE]', {
      requestId,
      applicationId: application.id,
      inviteId: inviteToken.id,
      email: inviteToken.email,
      emailSuccess: true,
      adminUserId: user.id,
      baseUrl,
      inviteLink: redactToken(inviteLink),
    });

    const isProd = process.env.NODE_ENV === "production";

    return NextResponse.json(
      {
        success: true,
        message: 'Invite sent successfully',
        inviteId: inviteToken.id,
        email: inviteToken.email,
        requestId,
        ...(isProd ? {} : { inviteLink }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin vendor invite error:', error);
    return NextResponse.json(
      { error: 'Failed to send invite' },
      { status: 500 }
    );
  }
}
