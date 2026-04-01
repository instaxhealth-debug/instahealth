/**
 * Shopify OAuth Callback Route
 *
 * Handles Shopify OAuth callback, exchanges code for access token, and triggers initial sync
 * ✅ SECURITY FIX: Nonce-based state verification with single-use consumption
 * ✅ FIX: Proper sync error handling and status reporting
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken } from "@/lib/shopify/client";
import { syncShopifyProducts } from "@/lib/shopify/sync-service";
import { registerWebhooks } from "@/lib/shopify/webhooks";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ✅ FIX: Use same BASE_URL logic as connect route for consistent redirect URLs
const BASE_URL =
  process.env.SHOPIFY_REDIRECT_URI?.replace(/\/api\/shopify\/callback$/, "") ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");

    // Validate parameters
    if (!code || !shop || !state) {
      const errorUrl = new URL(`${BASE_URL}/shopify`);
      errorUrl.searchParams.set("shop", shop || "unknown");
      errorUrl.searchParams.set("error", "missing_parameters");
      return NextResponse.redirect(errorUrl.toString());
    }

    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
      const errorUrl = new URL(`${BASE_URL}/shopify`);
      errorUrl.searchParams.set("shop", shop);
      errorUrl.searchParams.set("error", "not_configured");
      return NextResponse.redirect(errorUrl.toString());
    }

    // ✅ SECURITY FIX: Verify and consume nonce from database
    const oauthState = await prisma.shopifyOAuthState.findUnique({
      where: { nonce: state },
    });

    if (!oauthState) {
      console.error("Invalid or expired OAuth state nonce");
      const errorUrl = new URL(`${BASE_URL}/shopify`);
      errorUrl.searchParams.set("shop", shop);
      errorUrl.searchParams.set("error", "invalid_state");
      return NextResponse.redirect(errorUrl.toString());
    }

    // ✅ SECURITY FIX: Verify nonce TTL (prevent replay attacks with old nonces)
    const now = Date.now();
    const nonceAge = now - Number(oauthState.timestamp);
    if (nonceAge > NONCE_TTL_MS) {
      // Delete expired nonce
      await prisma.shopifyOAuthState.delete({
        where: { nonce: state },
      });
      const errorUrl = new URL(`${BASE_URL}/shopify`);
      errorUrl.searchParams.set("shop", shop);
      errorUrl.searchParams.set("error", "state_expired");
      return NextResponse.redirect(errorUrl.toString());
    }

    const vendorId = oauthState.vendorId;

    // ✅ SECURITY FIX: Single-use nonce - delete immediately after verification
    await prisma.shopifyOAuthState.delete({
      where: { nonce: state },
    });

    // ✅ PUBLIC INSTALL FIX: Handle null vendorId from /api/shopify/install endpoint
    // If vendorId is null, this is an App Store install without existing InstaHealth account
    // We need to prompt the merchant to create/link their account
    if (!vendorId) {
      console.log(
        "[SHOPIFY_CALLBACK] Public install detected (no vendorId), redirecting to account setup"
      );

      // Exchange code for access token first
      const tokenResponse = await exchangeCodeForToken(
        shop,
        code,
        SHOPIFY_CLIENT_ID,
        SHOPIFY_CLIENT_SECRET
      );

      // Store token temporarily for account linking
      // We'll create a special "pending" vendor record that can be claimed
      const pendingVendor = await prisma.vendor.create({
        data: {
          email: `shopify-pending-${shop}@instahealth.ae`,
          name: shop.replace(".myshopify.com", ""),
          slug: `shopify-pending-${shop.replace(".myshopify.com", "")}-${Date.now()}`,
          shopifyConnected: true,
          shopifyShopDomain: shop,
          shopifyAccessToken: tokenResponse.access_token,
          shopifyScopes: tokenResponse.scope,
          shopifyInstalledAt: new Date(),
          shopifySyncStatus: "pending_account",
        },
      });

      console.log(
        `[SHOPIFY_CALLBACK] Created pending vendor ${pendingVendor.id} for shop ${shop}`
      );

      // Redirect to account setup page with pending vendor ID
      const redirectUrl = new URL(`${BASE_URL}/shopify`);
      redirectUrl.searchParams.set("shop", shop);
      redirectUrl.searchParams.set("setup", "true");
      redirectUrl.searchParams.set("pendingVendor", pendingVendor.id);

      console.log(
        `[SHOPIFY_CALLBACK] Redirecting to account setup: ${redirectUrl.toString()}`
      );

      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Setup Required</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.top === window.self) {
        window.location.href = "${redirectUrl.toString()}";
      } else {
        var AppBridge = window['app-bridge'];
        var createApp = AppBridge.default;
        var Redirect = AppBridge.actions.Redirect;
        var app = createApp({
          apiKey: "${SHOPIFY_CLIENT_ID}",
          host: new URLSearchParams(window.location.search).get('host') || btoa("${shop}/admin")
        });
        var redirect = Redirect.create(app);
        redirect.dispatch(Redirect.Action.REMOTE, "${redirectUrl.toString()}");
      }
    });
  </script>
  <p>Setting up your InstaHealth account...</p>
</body>
</html>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // Verify vendor exists (for existing InstaHealth accounts)
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      const errorUrl = new URL(`${BASE_URL}/shopify`);
      errorUrl.searchParams.set("shop", shop);
      errorUrl.searchParams.set("error", "vendor_not_found");
      return NextResponse.redirect(errorUrl.toString());
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(
      shop,
      code,
      SHOPIFY_CLIENT_ID,
      SHOPIFY_CLIENT_SECRET
    );

    // Update vendor with Shopify connection
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        shopifyConnected: true,
        shopifyShopDomain: shop,
        shopifyAccessToken: tokenResponse.access_token,
        shopifyScopes: tokenResponse.scope,
        shopifyInstalledAt: new Date(),
        shopifySyncStatus: "pending",
      },
    });

    // ✅ AUTO-REGISTER WEBHOOKS: Register webhooks immediately after OAuth
    console.log(`[SHOPIFY_CALLBACK] Registering webhooks for vendor ${vendorId}, shop ${shop}`);
    try {
      const webhookResult = await registerWebhooks(shop, tokenResponse.access_token);

      if (webhookResult.success) {
        console.log(
          `[SHOPIFY_CALLBACK] ✅ Webhooks registered successfully: ${webhookResult.registered.length} new, ${webhookResult.skipped.length} existing`
        );
      } else {
        console.error(
          `[SHOPIFY_CALLBACK] ⚠️ Webhook registration had errors: ${webhookResult.errors.join("; ")}`
        );
        // Don't fail OAuth if webhooks fail - they can be registered manually later
      }
    } catch (webhookError) {
      console.error(
        `[SHOPIFY_CALLBACK] ❌ Webhook registration failed:`,
        webhookError
      );
      // Don't fail OAuth if webhooks fail
    }

    // ✅ FIX: Trigger initial product sync and handle errors properly
    syncShopifyProducts(vendorId)
      .then(async (result) => {
        if (!result.success) {
          console.error(`Initial sync had errors for vendor ${vendorId}:`, result.errors);
          await prisma.vendor.update({
            where: { id: vendorId },
            data: { shopifySyncStatus: "error" },
          });
        } else {
          console.log(`Initial sync completed for vendor ${vendorId}:`, result);
        }
      })
      .catch(async (error) => {
        console.error(`Initial sync failed for vendor ${vendorId}:`, error);
        await prisma.vendor.update({
          where: { id: vendorId },
          data: { shopifySyncStatus: "error" },
        }).catch(() => {
          // Ignore error updating status
        });
      });

    // ✅ SHOPIFY APP STORE FIX: Return 200 OK with embedded app redirect
    // Shopify automated checks require HTTP 200 response, not 302 redirect
    // We use App Bridge to redirect within the embedded app context
    const redirectUrl = new URL(`${BASE_URL}/shopify`);
    redirectUrl.searchParams.set("shop", shop);
    redirectUrl.searchParams.set("shopify", "connected");

    console.log(`[SHOPIFY_CALLBACK] Returning 200 OK with embedded app redirect: ${redirectUrl.toString()}`);

    // Return 200 with HTML that uses Shopify App Bridge to redirect
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.top === window.self) {
        // Not in iframe, use regular redirect
        window.location.href = "${redirectUrl.toString()}";
      } else {
        // In iframe, use App Bridge redirect
        var AppBridge = window['app-bridge'];
        var createApp = AppBridge.default;
        var Redirect = AppBridge.actions.Redirect;

        var app = createApp({
          apiKey: "${SHOPIFY_CLIENT_ID}",
          host: new URLSearchParams(window.location.search).get('host') || btoa("${shop}/admin")
        });

        var redirect = Redirect.create(app);
        redirect.dispatch(Redirect.Action.REMOTE, "${redirectUrl.toString()}");
      }
    });
  </script>
  <p>Redirecting to app...</p>
</body>
</html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error("Shopify callback error:", error);

    // Extract shop from request URL for error redirect
    const requestUrl = new URL(request.url);
    const shop = requestUrl.searchParams.get("shop");

    const errorUrl = new URL(`${BASE_URL}/shopify`);
    if (shop) {
      errorUrl.searchParams.set("shop", shop);
    }
    errorUrl.searchParams.set("error", "callback_failed");
    return NextResponse.redirect(errorUrl.toString());
  }
}
