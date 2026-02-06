import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyInviteToken, hashPassword } from '@/lib/auth-utils';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Find invite token by hash
    // We need to search through all tokens and find one that matches
    const inviteTokens = await prisma.inviteToken.findMany({
      where: {
        expiresAt: {
          gt: new Date(), // Not expired
        },
        usedAt: null, // Not used yet
      },
      include: {
        vendorApplication: true,
      },
    });

    let matchedToken = null;
    for (const inviteTokenRecord of inviteTokens) {
      if (verifyInviteToken(token, inviteTokenRecord.tokenHash)) {
        matchedToken = inviteTokenRecord;
        break;
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 400 }
      );
    }

    const application = matchedToken.vendorApplication;

    // Check if vendor already exists for this application
    if (application.approvedVendorId) {
      return NextResponse.json(
        { error: 'This vendor account has already been created' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create or update user (vendor account)
    let vendorUser = await prisma.user.findUnique({
      where: { email: application.contactEmail },
    });

    if (!vendorUser) {
      vendorUser = await prisma.user.create({
        data: {
          email: application.contactEmail,
          passwordHash,
          name: application.contactFullName,
          role: 'VENDOR',
        },
      });
    } else {
      // Update password
      await prisma.user.update({
        where: { id: vendorUser.id },
        data: { passwordHash, role: 'VENDOR' },
      });
    }

    // Prevent duplicate vendor by email
    const existingVendor = await prisma.vendor.findUnique({
      where: { email: application.contactEmail },
    });
    if (existingVendor) {
      return NextResponse.json(
        { error: 'A vendor with this email already exists' },
        { status: 409 }
      );
    }

    const baseSlug = generateSlug(application.legalBusinessName);
    const vendorSlug = await generateUniqueSlug(baseSlug, async (candidate) => {
      const existing = await prisma.vendor.findUnique({ where: { slug: candidate } });
      return !!existing;
    });

    // Create vendor record (inactive until compliance verified)
    const vendor = await prisma.vendor.create({
      data: {
        name: application.legalBusinessName,
        slug: vendorSlug,
        email: application.contactEmail,
        userId: vendorUser.id,
        country: application.country,
        legalEntityName: application.legalBusinessName,
        licenseNumber: application.businessRegNumber,
        status: 'inactive',
        complianceAccepted: false,
        complianceAcceptedAt: null,
      },
    });

    // Mark token as used
    await prisma.inviteToken.update({
      where: { id: matchedToken.id },
      data: {
        usedAt: new Date(),
        createdVendorId: vendor.id,
      },
    });

    // Update application to link vendor
    await prisma.vendorApplication.update({
      where: { id: application.id },
      data: {
        approvedVendorId: vendor.id,
        notes: `Vendor account created with ID: ${vendor.id}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        vendor: {
          id: vendor.id,
          email: vendor.email,
          businessName: vendor.name,
        },
        message: 'Vendor account created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { error: 'Failed to activate account' },
      { status: 500 }
    );
  }
}
