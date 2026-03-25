/**
 * Shopify GDPR Compliance Webhook: shop/redact
 *
 * MANDATORY webhook for Shopify App Store review
 * Handles shop data deletion when merchant uninstalls app
 *
 * Shopify Documentation:
 * https://shopify.dev/docs/apps/build/privacy-law-compliance/shop-data-erasure
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyWebhookSignature } from "@/lib/shopify/client";
import { prisma } from "@/lib/prisma";

const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const headersList = headers();
    const hmac = headersList.get("x-shopify-hmac-sha256");
    const shopDomain = headersList.get("x-shopify-shop-domain");
    const topic = headersList.get("x-shopify-topic");

    console.log(`[GDPR:SHOP_REDACT] Received webhook from shop: ${shopDomain}`);

    if (!hmac || !shopDomain) {
      console.error("[GDPR:SHOP_REDACT] Missing required headers");
      // CRITICAL: Missing HMAC must return 401 (not 400) per Shopify requirements
      return NextResponse.json(
        { error: "Unauthorized - missing authentication headers" },
        { status: 401 }
      );
    }

    // Get raw body for HMAC verification
    const body = await request.text();

    // Verify HMAC signature
    if (!SHOPIFY_CLIENT_SECRET) {
      console.error("[GDPR:SHOP_REDACT] Webhook secret not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const isValid = verifyWebhookSignature(body, hmac, SHOPIFY_CLIENT_SECRET);
    if (!isValid) {
      console.error("[GDPR:SHOP_REDACT] ❌ Invalid HMAC signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("[GDPR:SHOP_REDACT] ✅ HMAC signature verified");

    // Parse payload
    const payload = JSON.parse(body);

    /**
     * Shopify payload structure:
     * {
     *   shop_id: number,
     *   shop_domain: string
     * }
     *
     * Sent 48 hours after merchant uninstalls your app
     */

    console.log(`[GDPR:SHOP_REDACT] Processing shop redaction for shop ID ${payload.shop_id}`);

    // Find vendor by shop domain
    const vendor = await prisma.vendor.findFirst({
      where: {
        shopifyShopDomain: shopDomain,
      },
    });

    if (!vendor) {
      console.warn(`[GDPR:SHOP_REDACT] No vendor found for shop: ${shopDomain}`);
      // Still return 200 to acknowledge webhook receipt
      return NextResponse.json({
        message: "Shop redaction acknowledged - no vendor data found"
      });
    }

    /**
     * COMPLIANCE IMPLEMENTATION:
     *
     * You have 48 hours after app uninstall to:
     * 1. Delete shop-specific data (access tokens, shop info)
     * 2. Anonymize or delete analytics tied to shop
     * 3. Remove shop from active processing
     *
     * You may KEEP:
     * - Anonymized aggregate data
     * - Billing records (required by law)
     * - Fraud prevention data
     *
     * Current implementation:
     * - Delete Shopify access token
     * - Mark products as inactive
     * - Keep vendor record for historical purposes (GDPR-compliant)
     */

    console.log(`[GDPR:SHOP_REDACT] Redacting data for vendor ${vendor.id}, shop ${shopDomain}`);

    // Delete sensitive shop data while preserving vendor record
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        shopifyConnected: false,
        shopifyAccessToken: null, // ✅ Delete access token (most sensitive)
        shopifyScopes: null,
        shopifySyncStatus: "redacted",
        // Keep shop domain for audit trail (GDPR allows this)
      },
    });

    // Mark all Shopify products as inactive (keep for historical orders)
    const productsUpdated = await prisma.product.updateMany({
      where: {
        vendorId: vendor.id,
        source: "shopify",
      },
      data: {
        active: false,
        syncStatus: "redacted",
      },
    });

    console.log(`[GDPR:SHOP_REDACT] ✅ Redaction complete: vendor ${vendor.id}, ${productsUpdated.count} products marked inactive`);

    /**
     * Additional cleanup if you store more shop data:
     *
     * await prisma.shopAnalytics.deleteMany({
     *   where: { vendorId: vendor.id }
     * });
     *
     * await prisma.shopSettings.delete({
     *   where: { vendorId: vendor.id }
     * });
     */

    // Return 200 to acknowledge webhook receipt
    return NextResponse.json({
      message: "Shop redaction completed",
      shop_id: payload.shop_id,
      shop_domain: shopDomain,
      products_deactivated: productsUpdated.count
    });

  } catch (error) {
    console.error("[GDPR:SHOP_REDACT] Error processing webhook:", error);

    // Still return 200 to prevent Shopify from retrying
    // Log the error for manual review
    return NextResponse.json({
      message: "Error acknowledged - will be processed manually",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
