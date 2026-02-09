import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { getBaseUrl, redactToken } from "@/lib/url";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: true, requestId }, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ success: true, requestId }, { status: 200 });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = getBaseUrl({ requestId, route: "/api/auth/forgot-password" });
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    const emailResult = await sendPasswordResetEmail(email, resetLink);

    console.log("[PASSWORD_RESET]", {
      requestId,
      email,
      emailSuccess: emailResult.success,
      emailError: emailResult.error,
      baseUrl,
      resetLink: redactToken(resetLink),
    });

    return NextResponse.json({ success: true, requestId }, { status: 200 });
  } catch (error) {
    console.error("[PASSWORD_RESET] Error:", error);
    return NextResponse.json({ success: true, requestId }, { status: 200 });
  }
}
