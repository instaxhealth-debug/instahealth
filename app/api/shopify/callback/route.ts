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
      return NextResponse.redirect(
        `${BASE_URL}/vendor/dashboard?error=missing_parameters`
      );
    }

    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${BASE_URL}/vendor/dashboard?error=not_configured`
      );
    }

    // ✅ SECURITY FIX: Verify and consume nonce from database
    const oauthState = await prisma.shopifyOAuthState.findUnique({
      where: { nonce: state },
    });

    if (!oauthState) {
      console.error("Invalid or expired OAuth state nonce");
      return NextResponse.redirect(
        `${BASE_URL}/vendor/dashboard?error=invalid_state`
      );
    }

    // ✅ SECURITY FIX: Verify nonce TTL (prevent replay attacks with old nonces)
    const now = Date.now();
    const nonceAge = now - Number(oauthState.timestamp);
    if (nonceAge > NONCE_TTL_MS) {
      // Delete expired nonce
      await prisma.shopifyOAuthState.delete({
        where: { nonce: state },
      });
      return NextResponse.redirect(
        `${BASE_URL}/vendor/dashboard?error=state_expired`
      );
    }

    const vendorId = oauthState.vendorId;

    // ✅ SECURITY FIX: Single-use nonce - delete immediately after verification
    await prisma.shopifyOAuthState.delete({
      where: { nonce: state },
    });

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return NextResponse.redirect(
        `${BASE_URL}/vendor/dashboard?error=vendor_not_found`
      );
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

    // Redirect to vendor dashboard with success message
    return NextResponse.redirect(
      `${BASE_URL}/vendor/dashboard?shopify=connected`
    );
  } catch (error) {
    console.error("Shopify callback error:", error);
    return NextResponse.redirect(
      `${BASE_URL}/vendor/dashboard?error=callback_failed`
    );
  }
}
