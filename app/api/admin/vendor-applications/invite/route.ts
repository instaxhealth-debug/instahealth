import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendVendorInviteEmail } from "@/lib/email";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { createHash, randomUUID } from "crypto";
import { getBaseUrl, redactToken, isValidProductionBaseUrl } from "@/lib/url";

function maskEmailForLogs(email: string | null | undefined) {
  if (!email) {
    return "unknown";
  }
  const [local, domain] = email.split("@");
  if (!domain) {
    return "invalid";
  }
  const trimmedLocal = local || "";
  if (trimmedLocal.length <= 2) {
    return `***@${domain}`;
  }
  return `${trimmedLocal[0]}***${trimmedLocal[trimmedLocal.length - 1]}@${domain}`;
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId is required", requestId },
        { status: 400 }
      );
    }

    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found", requestId },
        { status: 404 }
      );
    }

    if (application.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Application must be APPROVED to send invite", requestId },
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
    } else if (vendorUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "Contact email belongs to an admin account", requestId },
        { status: 400 }
      );
    }

    let vendor = null;
    if (application.approvedVendorId) {
      vendor = await prisma.vendor.findUnique({
        where: { id: application.approvedVendorId },
      });
    }

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
          userId: vendorUser.id,
          status: "active",
          legalEntityName: application.legalBusinessName,
          country: application.country,
          licenseNumber: application.businessRegNumber,
          allowedCategories: [],
        },
      });
    } else if (!vendor.userId || vendor.userId !== vendorUser.id) {
      vendor = await prisma.vendor.update({
        where: { id: vendor.id },
        data: { userId: vendorUser.id, status: "active" },
      });
    }

    const rawToken = randomUUID();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const invite = await prisma.vendorInvite.create({
      data: {
        applicationId: application.id,
        vendorId: vendor.id,
        email: application.contactEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = getBaseUrl({ requestId, route: "/api/admin/vendor-applications/invite", allowBadBaseUrl: true });
    const isProd = process.env.NODE_ENV === "production";
    const isValidBaseUrl = !isProd || isValidProductionBaseUrl(baseUrl);

    if (!isValidBaseUrl) {
      const errorMessage = "Invalid baseUrl for production email links";
      await prisma.vendorInvite.update({
        where: { id: invite.id },
        data: {
          emailStatus: "FAILED",
          emailError: errorMessage,
          emailSentAt: null,
        },
      });

      console.error("[VENDOR_INVITE_EMAIL_INVALID_BASEURL]", {
        requestId,
        applicationId: application.id,
        inviteId: invite.id,
        baseUrl,
        vendorEmail: application.contactEmail,
        emailFrom: maskEmailForLogs(process.env.EMAIL_FROM),
      });

      await prisma.vendorApplication.update({
        where: { id: application.id },
        data: {
          inviteEmailStatus: "FAILED",
          inviteEmailError: errorMessage,
          inviteEmailMessageId: null,
          inviteEmailSentAt: null,
        },
      });

      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_CONFIG_INVALID",
          message: errorMessage,
          requestId,
          providerError: errorMessage,
          inviteId: invite.id,
        },
        { status: 500 }
      );
    }
    const inviteLink = `${baseUrl}/vendor/activate?token=${rawToken}`;

    const emailResult = await sendVendorInviteEmail(
      application.contactEmail,
      application.legalBusinessName,
      inviteLink
    );

    const emailStatus = emailResult.success ? "SENT" : "FAILED";
    const emailError = emailResult.success
      ? null
      : (emailResult.providerError || emailResult.error || "Unknown error");
    const emailMessageId = emailResult.success ? (emailResult.messageId || null) : null;
    const emailSentAt = emailResult.success ? new Date() : null;

    await prisma.vendorInvite.update({
      where: { id: invite.id },
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

    console.log("[VENDOR_INVITE_EMAIL]", {
      requestId,
      applicationId: application.id,
      inviteId: invite.id,
      vendorEmail: application.contactEmail,
      baseUrl,
      emailFrom: maskEmailForLogs(process.env.EMAIL_FROM),
      status: emailResult.success ? "SENT" : "FAILED",
      emailMessageId: emailResult.messageId || null,
      emailError: emailResult.error || null,
      providerError: emailResult.providerError || null,
    });

    if (emailResult.success) {
      await prisma.vendorApplication.update({
        where: { id: application.id },
        data: {
          notes: `Invite sent to ${application.contactEmail}`,
        },
      });
    }

    console.log("[VENDOR_INVITE]", {
      requestId,
      applicationId: application.id,
      contactEmail: application.contactEmail,
      vendorId: vendor.id,
      userId: vendorUser.id,
      inviteId: invite.id,
      emailSuccess: emailResult.success,
      emailError: emailResult.error,
      adminUserId,
      baseUrl,
      inviteLink: redactToken(inviteLink),
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_SEND_FAILED",
          message: emailResult.error || "Failed to send invite email",
          requestId,
          providerError: emailResult.providerError || null,
          inviteId: invite.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        messageId: emailResult.messageId || null,
        inviteId: invite.id,
        requestId,
        ...(isProd ? {} : { inviteLink }),
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[VENDOR_INVITE] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        code: "UNKNOWN",
        message: "Failed to send invite",
        requestId,
        providerError: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
