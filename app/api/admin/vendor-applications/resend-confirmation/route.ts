import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { sendVendorApplicationEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  try {
    await requireAdmin();
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

    const emailResult = await sendVendorApplicationEmail(
      application.contactEmail,
      application.legalBusinessName,
      application.id
    );

    await prisma.vendorApplication.update({
      where: { id: application.id },
      data: {
        confirmationEmailStatus: emailResult.success ? "SENT" : "FAILED",
        confirmationEmailMessageId: emailResult.messageId || null,
        confirmationEmailError: emailResult.error || null,
        confirmationEmailSentAt: emailResult.success ? new Date() : null,
      },
    });

    console.log("[VENDOR_CONFIRMATION_RESEND]", {
      requestId,
      applicationId: application.id,
      contactEmail: application.contactEmail,
      emailSuccess: emailResult.success,
      emailError: emailResult.error,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send confirmation email", requestId },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: true, requestId },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[VENDOR_CONFIRMATION_RESEND] Error:", error);
    return NextResponse.json(
      { error: "Failed to resend confirmation email", requestId },
      { status: 500 }
    );
  }
}
