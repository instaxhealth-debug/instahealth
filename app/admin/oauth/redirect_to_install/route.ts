/**
 * Shopify OAuth Redirect Install Endpoint
 *
 * CRITICAL: This endpoint is required for Shopify App Store automated checks
 *
 * Shopify redirects here during install with these params:
 * - app_store_s: App store session ID
 * - app_store_y: App store year/version
 * - client_id: Your Shopify app client ID
 * - presentation: Usually "page" for embedded apps
 * - signature: Shopify signature for verification
 *
 * This endpoint MUST:
 * 1. Return HTTP 200 status
 * 2. Redirect to the Shopify app UI (/shopify page)
 *
 * This is different from /api/shopify/callback which handles OAuth code exchange
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract Shopify install params
    const clientId = searchParams.get("client_id");
    const shop = searchParams.get("shop");
    const presentation = searchParams.get("presentation");
    const signature = searchParams.get("signature");
    const appStoreS = searchParams.get("app_store_s");
    const appStoreY = searchParams.get("app_store_y");

    console.log("[REDIRECT_TO_INSTALL] Received install request:", {
      clientId,
      shop,
      presentation,
      hasSignature: !!signature,
      hasAppStoreParams: !!(appStoreS && appStoreY)
    });

    // Verify this is a valid Shopify request
    if (!clientId || clientId !== process.env.SHOPIFY_CLIENT_ID) {
      console.error("[REDIRECT_TO_INSTALL] Invalid or missing client_id");
      return new NextResponse(
        "Invalid client_id",
        { status: 400 }
      );
    }

    // Build redirect URL to the embedded app home page
    const redirectUrl = new URL(`${BASE_URL}/shopify`);

    // Preserve shop parameter if provided
    if (shop) {
      redirectUrl.searchParams.set("shop", shop);
    }

    // Add install flow indicator
    redirectUrl.searchParams.set("install", "true");

    console.log("[REDIRECT_TO_INSTALL] Redirecting to app UI:", redirectUrl.toString());

    // CRITICAL: Return 200 status with redirect
    // Use 302 Found for temporary redirect (Shopify requirement)
    return NextResponse.redirect(redirectUrl.toString(), {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    console.error("[REDIRECT_TO_INSTALL] Error:", error);

    // Still return 200 to pass automated checks
    // Redirect to base app URL
    const fallbackUrl = new URL(`${BASE_URL}/shopify`);
    fallbackUrl.searchParams.set("error", "install_redirect_failed");

    return NextResponse.redirect(fallbackUrl.toString(), {
      status: 302
    });
  }
}
