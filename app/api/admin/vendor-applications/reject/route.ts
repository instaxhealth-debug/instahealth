import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  try {
    await requireAdmin();
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId is required" },
        { status: 400 }
      );
    }

    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    await prisma.vendorApplication.update({
      where: { id: application.id },
      data: {
        status: "REJECTED",
        notes: "Rejected by admin",
      },
    });

    console.log("[VENDOR_REJECT]", {
      requestId,
      applicationId: application.id,
      contactEmail: application.contactEmail,
    });

    return NextResponse.json(
      { success: true, applicationId: application.id, requestId },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[VENDOR_REJECT] Error:", error);
    return NextResponse.json(
      { error: "Failed to reject application", requestId },
      { status: 500 }
    );
  }
}
