import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateInviteToken } from '@/lib/auth-utils';
import { sendVendorInviteEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
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
    const { applicationId, vendorEmail, vendorName, vendorSlug } = body;

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

    // Generate invite token
    const { token, hash } = generateInviteToken();

    // Create or update invite token record
    const inviteToken = await prisma.inviteToken.create({
      data: {
        vendorApplicationId: application.id,
        tokenHash: hash,
        email: application.contactEmail,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
    });

    // Generate invite link
    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/vendor/accept-invite?token=${token}`;

    // Send invite email
    const emailResult = await sendVendorInviteEmail(
      application.contactEmail,
      application.legalBusinessName,
      inviteLink
    );

    if (!emailResult.success) {
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

    return NextResponse.json(
      {
        success: true,
        message: 'Invite sent successfully',
        inviteId: inviteToken.id,
        email: inviteToken.email,
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
