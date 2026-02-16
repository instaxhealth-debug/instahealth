import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendVendorInviteEmail } from "@/lib/email";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { createHash, randomUUID } from "crypto";
import { getBaseUrl, isValidProductionBaseUrl } from "@/lib/url";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  let applicationId: string | undefined;

  try {
    const session = await requireAdmin();
    const body = await request.json();
    applicationId = body.applicationId;

    if (!applicationId) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "applicationId is required",
          requestId
        },
        { status: 400 }
      );
    }

    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Application not found",
          requestId
        },
        { status: 400 }
      );
    }

    if (application.status !== "PENDING") {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Application must be in PENDING status",
          requestId
        },
        { status: 400 }
      );
    }

    const adminUser = session?.user?.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;
    const adminUserId = adminUser?.id || session?.user?.email || "ADMIN";

    let vendorUser = await prisma.user.findUnique({
      where: { email: application.contactEmail },
    });

    if (!vendorUser) {
      vendorUser = await prisma.user.create({
        data: {
          email: application.contactEmail,
          name: application.contactFullName,
          role: "VENDOR",
          passwordHash: null,
        },
      });
    } else if (vendorUser.role !== "VENDOR") {
      if (vendorUser.role === "ADMIN") {
        return NextResponse.json(
          {
            ok: false,
            code: "FORBIDDEN",
            message: "Contact email belongs to an admin account",
            requestId
          },
          { status: 403 }
        );
      }
      vendorUser = await prisma.user.update({
        where: { id: vendorUser.id },
        data: { role: "VENDOR" },
      });
    }

    let vendor = await prisma.vendor.findUnique({
      where: { email: application.contactEmail },
    });

    if (!vendor) {
      const baseSlug = generateSlug(application.tradingName || application.legalBusinessName);
      const vendorSlug = await generateUniqueSlug(baseSlug, async (candidate) => {
        const existing = await prisma.vendor.findUnique({ where: { slug: candidate } });
        return !!existing;
      });

      vendor = await prisma.vendor.create({
        data: {
          name: application.tradingName || application.legalBusinessName,
          slug: vendorSlug,
          email: application.contactEmail,
          phone: application.contactPhone || null,
          phoneRaw: application.contactPhoneRaw || null,
          userId: vendorUser.id,
          status: "active",
          legalEntityName: application.legalBusinessName,
          country: application.country,
          licenseNumber: application.businessRegNumber,
          logoUrl: application.logoUrl || null,
          allowedCategories: application.selectedCategories || [],
        },
      });
    } else if (!vendor.userId) {
      vendor = await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          userId: vendorUser.id,
          status: "active",
          phone: application.contactPhone || vendor.phone,
          phoneRaw: application.contactPhoneRaw || vendor.phoneRaw,
          logoUrl: application.logoUrl || vendor.logoUrl,
          allowedCategories: application.selectedCategories && application.selectedCategories.length > 0
            ? application.selectedCategories
            : vendor.allowedCategories,
        },
      });
    }

    // CRITICAL: Update DB first in transaction, THEN attempt email
    const rawToken = randomUUID();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    // Step 1: DB transaction - create invite and approve application
    const conflictingApproval = await prisma.vendorApplication.findFirst({
      where: {
        approvedVendorId: vendor.id,
        NOT: { id: application.id },
      },
      select: { id: true },
    });

    const inviteToken = await prisma.$transaction(async (tx) => {
      // Create invite with PENDING email status
      const invite = await tx.vendorInvite.create({
        data: {
          applicationId: application.id,
          vendorId: vendor.id,
          tokenHash,
          email: application.contactEmail,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          emailStatus: "PENDING",
        },
      });

      // Update application status to APPROVED
      await tx.vendorApplication.update({
        where: { id: application.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: adminUserId,
          ...(conflictingApproval ? {} : { approvedVendorId: vendor.id }),
          notes: `Approved by ${adminUserId}`,
        },
      });

      return invite;
    });

    // Step 2: Attempt email (this can fail without affecting approval)
    let baseUrl: string;
    let inviteLink: string;
    let emailResult: { success: boolean; error?: string; messageId?: string; providerError?: string };

    try {
      baseUrl = getBaseUrl({ requestId, route: "/api/admin/vendor-applications/approve", allowBadBaseUrl: true });

      const environment = process.env.NODE_ENV || 'unknown';
      if (environment === 'production' && !isValidProductionBaseUrl(baseUrl)) {
        throw new Error('Invalid baseUrl for production email links');
      }

      inviteLink = `${baseUrl}/vendor/activate?token=${rawToken}`;

      emailResult = await sendVendorInviteEmail(
        application.contactEmail,
        application.legalBusinessName,
        inviteLink
      );
    } catch (error: any) {
      // Email failed - record it but don't fail the approval
      emailResult = {
        success: false,
        error: (error?.message || 'Unknown email error').substring(0, 500),
        providerError: error?.message || 'Unknown email error',
      };
      baseUrl = 'https://instahealth.ae'; // Fallback for logging
      inviteLink = `${baseUrl}/vendor/activate?token=${rawToken}`;
    }

    // Step 3: Update invite with email result
    const emailStatus = emailResult.success ? "SENT" : "FAILED";
    const emailMessageId = emailResult.messageId || null;
    const emailError = emailResult.success
      ? null
      : (emailResult.providerError || emailResult.error)
        ? (emailResult.providerError || emailResult.error || "").substring(0, 500)
        : null;
    const emailSentAt = emailResult.success ? new Date() : null;

    await prisma.vendorInvite.update({
      where: { id: inviteToken.id },
      data: {
        emailStatus,
        emailMessageId,
        emailError,
        emailSentAt,
      },
    });

    await prisma.vendorApplication.update({
      where: { id: application.id },
      data: {
        inviteEmailStatus: emailStatus,
        inviteEmailMessageId: emailMessageId,
        inviteEmailError: emailError,
        inviteEmailSentAt: emailSentAt,
      },
    });

    // Update application notes with email result
    await prisma.vendorApplication.update({
      where: { id: application.id },
      data: {
        notes: emailResult.success
          ? `Approved by ${adminUserId}. Invite sent to ${application.contactEmail}`
          : `Approved by ${adminUserId}. Invite email FAILED: ${emailResult.error || "unknown error"}`,
      },
    });

    console.log("[VENDOR_APPROVE]", {
      requestId,
      applicationId: application.id,
      inviteId: inviteToken.id,
      vendorId: vendor.id,
      inviteEmailStatus: emailResult.success ? "SENT" : "FAILED",
      emailError: emailResult.error ? emailResult.error.substring(0, 200) : null,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_SEND_FAILED",
          message: emailResult.error || "Failed to send invite email",
          requestId,
          providerError: emailResult.providerError || null,
          inviteId: inviteToken.id,
          applicationId: application.id,
          inviteEmailStatus: "FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        messageId: emailResult.messageId || null,
        inviteId: inviteToken.id,
        applicationId: application.id,
        requestId,
        inviteEmailStatus: "SENT",
      },
      { status: 200 }
    );
  } catch (error: any) {
    const errorName = error?.name || 'UnknownError';
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorStack = error?.stack || '';

    console.error('[ADMIN_APPROVE_ERROR]', {
      requestId,
      applicationId: applicationId || 'unknown',
      errName: errorName,
      errMessage: errorMessage,
      errStack: errorStack,
    });

    // Determine error code
    let code = 'UNKNOWN';
    let statusCode = 500;
    let safeMessage = 'Failed to approve application';

    if (error.message?.includes("redirect")) {
      code = 'UNAUTHORIZED';
      statusCode = 401;
      safeMessage = 'Unauthorized';
    } else if (errorMessage.includes('Prisma') || errorMessage.includes('database')) {
      code = 'DB_ERROR';
      safeMessage = 'Database error occurred';
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('required')) {
      code = 'VALIDATION_ERROR';
      statusCode = 400;
      safeMessage = 'Validation error occurred';
    }

    return NextResponse.json(
      {
        ok: false,
        code,
        message: safeMessage,
        requestId,
      },
      { status: statusCode }
    );
  }
}
