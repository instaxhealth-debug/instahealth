import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getBaseUrl } from "@/lib/url";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const host = request.headers.get("host") || "unknown";
    const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
    const nodeEnv = process.env.NODE_ENV || "unknown";
    const baseUrlComputed = getBaseUrl({ allowBadBaseUrl: true });

    return NextResponse.json({
      environment,
      host,
      nodeEnv,
      baseUrlComputed,
      nextAuthUrl: process.env.NEXTAUTH_URL || null,
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      emailFrom: process.env.EMAIL_FROM || null,
      vendorApplyToConfigured: Boolean(process.env.VENDOR_APPLY_TO),
    });
  } catch (error: any) {
    if (error.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[EMAIL_DIAG] Error:", error);
    return NextResponse.json({ error: "Failed to load diagnostics" }, { status: 500 });
  }
}
