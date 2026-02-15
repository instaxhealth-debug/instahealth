import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getBaseUrl, normalizeBaseUrl } from "@/lib/url";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const host = request.headers.get("host") || "unknown";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
    const nodeEnv = process.env.NODE_ENV || "unknown";
    const rawHostDerivedBaseUrl = `${proto}://${host}`;
    const baseUrlComputed = getBaseUrl({ allowBadBaseUrl: true });
    const normalizedBaseUrlComputed = normalizeBaseUrl(baseUrlComputed);
    const emailFrom = process.env.EMAIL_FROM || null;
    const emailFromDomain = emailFrom?.split("@")[1]?.toLowerCase() || null;
    const allowedFromDomains = (process.env.RESEND_ALLOWED_FROM_DOMAINS || "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);
    const effectiveAllowedDomains = allowedFromDomains.length
      ? allowedFromDomains
      : emailFromDomain
        ? [emailFromDomain]
        : [];
    const emailFromDomainAllowed = emailFromDomain
      ? effectiveAllowedDomains.includes(emailFromDomain)
      : false;

    return NextResponse.json({
      environment,
      hostHeader: host,
      nodeEnv,
      baseUrlComputed,
      rawHostDerivedBaseUrl,
      normalizedBaseUrlComputed,
      domainUsedForLinks: normalizedBaseUrlComputed,
      nextAuthUrl: process.env.NEXTAUTH_URL || null,
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      emailFrom,
      emailFromDomain,
      emailFromDomainAllowed,
      allowedFromDomains: effectiveAllowedDomains,
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
