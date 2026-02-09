import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { hashPassword } from "@/lib/auth-utils";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required", requestId }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters", requestId }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link", requestId }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: resetToken.email } });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link", requestId }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    console.log("[PASSWORD_RESET]", {
      requestId,
      email: resetToken.email,
      tokenId: resetToken.id,
    });

    return NextResponse.json({ success: true, email: resetToken.email, requestId }, { status: 200 });
  } catch (error) {
    console.error("[PASSWORD_RESET] Error:", error);
    return NextResponse.json({ error: "Failed to reset password", requestId }, { status: 500 });
  }
}
