import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

function getHostFromUrl(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function getDatabaseHost(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return {
      host: url.host,
      database: url.pathname?.replace("/", "") || null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error: any) {
    if (error?.message?.includes("redirect")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const databaseInfo = getDatabaseHost(process.env.DATABASE_URL);
  const directInfo = getDatabaseHost(process.env.DIRECT_URL);

  return NextResponse.json(
    {
      runtime: {
        nodeEnv: process.env.NODE_ENV || null,
        vercelEnv: process.env.VERCEL_ENV || null,
        hostHeader: request.headers.get("host"),
      },
      nextAuth: {
        hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
        nextAuthUrlHost: getHostFromUrl(process.env.NEXTAUTH_URL),
        hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      },
      database: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        databaseHost: databaseInfo?.host || null,
        databaseName: databaseInfo?.database || null,
        hasDirectUrl: Boolean(process.env.DIRECT_URL),
        directHost: directInfo?.host || null,
      },
      email: {
        hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
        emailFrom: process.env.EMAIL_FROM ? "set" : "missing",
        vendorApplyTo: process.env.VENDOR_APPLY_TO ? "set" : "missing",
        hasAdminEmail: Boolean(process.env.ADMIN_EMAIL),
      },
      security: {
        hasCronSecret: Boolean(process.env.CRON_SECRET),
      },
      stripe: {
        hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
        hasStripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        hasStripePublishableKey: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      },
      algolia: {
        hasAlgoliaAppId: Boolean(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID),
        hasAlgoliaSearchKey: Boolean(process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY),
        hasAlgoliaWriteKey: Boolean(process.env.ALGOLIA_WRITE_API_KEY),
        hasAlgoliaAdminKey: Boolean(process.env.ALGOLIA_ADMIN_API_KEY),
      },
    },
    { status: 200 }
  );
}
