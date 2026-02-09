import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendVendorInviteEmail } from "@/lib/email";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { createHash, randomUUID } from "crypto";
import { getBaseUrl, redactToken } from "@/lib/url";

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

    const baseUrl = getBaseUrl({ requestId, route: "/api/admin/vendor-applications/invite" });
    const inviteLink = `${baseUrl}/vendor/activate?token=${rawToken}`;

    const emailResult = await sendVendorInviteEmail(
      application.contactEmail,
      application.legalBusinessName,
      inviteLink
    );

    console.log("[VENDOR_INVITE_EMAIL]", {
      requestId,
      applicationId: application.id,
      inviteId: invite.id,
      email: application.contactEmail,
      emailSuccess: emailResult.success,
      emailError: emailResult.error,
      emailMessageId: emailResult.messageId || null,
      baseUrl,
      inviteLink: redactToken(inviteLink),
    });

    await prisma.vendorInvite.update({
      where: { id: invite.id },
      data: {
        emailStatus: emailResult.success ? "SENT" : "FAILED",
        emailMessageId: emailResult.messageId || null,
        emailError: emailResult.error || null,
        emailSentAt: emailResult.success ? new Date() : null,
      },
    });

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
        { error: "Failed to send invite email", requestId, inviteId: invite.id },
        { status: 502 }
      );
    }

    const isProd = process.env.NODE_ENV === "production";

    return NextResponse.json(
      { success: true, inviteId: invite.id, requestId, ...(isProd ? {} : { inviteLink }) },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[VENDOR_INVITE] Error:", error);
    return NextResponse.json(
      { error: "Failed to send invite", requestId },
      { status: 500 }
    );
  }
}
