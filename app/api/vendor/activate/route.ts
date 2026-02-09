import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { createHash, randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const invite = await prisma.vendorInvite.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!invite) {
    return NextResponse.json(
      { error: "Invalid or expired invite link" },
      { status: 400 }
    );
  }

  const application = invite.applicationId
    ? await prisma.vendorApplication.findUnique({ where: { id: invite.applicationId } })
    : null;

  return NextResponse.json(
    {
      email: invite.email,
      businessName: application?.tradingName || application?.legalBusinessName || null,
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const invite = await prisma.vendorInvite.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 400 }
      );
    }

    const application = invite.applicationId
      ? await prisma.vendorApplication.findUnique({ where: { id: invite.applicationId } })
      : null;

    if (!application) {
      return NextResponse.json(
        { error: "Invite is missing an application reference" },
        { status: 400 }
      );
    }

    const email = invite.email;

    let vendorUser = await prisma.user.findUnique({ where: { email } });

    if (!vendorUser) {
      vendorUser = await prisma.user.create({
        data: {
          email,
          name: application.contactFullName,
          role: "VENDOR",
          passwordHash: await hashPassword(password),
        },
      });
    } else {
      if (vendorUser.role === "ADMIN") {
        return NextResponse.json(
          { error: "Invite email is associated with an admin account" },
          { status: 400 }
        );
      }
      vendorUser = await prisma.user.update({
        where: { id: vendorUser.id },
        data: {
          passwordHash: await hashPassword(password),
          role: "VENDOR",
        },
      });
    }

    let vendor = null;

    if (invite.vendorId) {
      vendor = await prisma.vendor.findUnique({
        where: { id: invite.vendorId },
      });
    }

    if (!vendor && application.approvedVendorId) {
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
          email,
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
        data: {
          userId: vendorUser.id,
          status: "active",
        },
      });
    }

    await prisma.vendorInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        vendorId: vendor.id,
      },
    });

    const conflictingApproval = await prisma.vendorApplication.findFirst({
      where: {
        approvedVendorId: vendor.id,
        NOT: { id: application.id },
      },
      select: { id: true },
    });

    if (!conflictingApproval && (!application.approvedVendorId || application.approvedVendorId === vendor.id)) {
      await prisma.vendorApplication.update({
        where: { id: application.id },
        data: {
          approvedVendorId: vendor.id,
        },
      });
    } else {
      console.warn("[VENDOR_ACTIVATE] Skipped approvedVendorId update", {
        requestId,
        applicationId: application.id,
        approvedVendorId: application.approvedVendorId,
        currentVendorId: vendor.id,
        conflictingApplicationId: conflictingApproval?.id || null,
      });
    }

    console.log("[VENDOR_ACTIVATE]", {
      requestId,
      inviteId: invite.id,
      email,
      userId: vendorUser.id,
      vendorId: vendor.id,
      success: true,
      baseUrl: null,
    });

    return NextResponse.json(
      {
        success: true,
        vendor: {
          id: vendor.id,
          email: vendor.email,
          businessName: vendor.name,
        },
        message: "Vendor account activated successfully",
        requestId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[VENDOR_ACTIVATE] Error:", error);
    return NextResponse.json(
      { error: "Failed to activate account", requestId },
      { status: 500 }
    );
  }
}
