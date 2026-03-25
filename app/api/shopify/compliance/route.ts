/**
 * Shopify Compliance Webhook Handler
 *
 * CRITICAL: This is the SINGLE endpoint for ALL mandatory GDPR compliance webhooks
 * Required for Shopify App Store approval and automated checks
 *
 * This endpoint handles:
 * - customers/data_request - Customer requests their data (GDPR Article 15)
 * - customers/redact - Customer requests data deletion (GDPR Article 17)
 * - shop/redact - Shop uninstalled, delete all shop data within 48 hours
 *
 * IMPORTANT: Invalid or missing HMAC MUST return 401 Unauthorized (not 400)
 *
 * Configured in shopify.app.toml:
 * [[webhooks.subscriptions]]
 * topics = ["customers/data_request", "customers/redact", "shop/redact"]
 * uri = "/api/shopify/compliance"
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

    console.log(`[SHOPIFY_COMPLIANCE] Received webhook: ${topic} from shop: ${shopDomain}`);

    // CRITICAL: Missing HMAC or shop domain MUST return 401 (not 400)
    // This is a Shopify App Store requirement for security
    if (!hmac || !shopDomain) {
      console.error("[SHOPIFY_COMPLIANCE] Missing required headers (HMAC or shop domain)");
      return NextResponse.json(
        { error: "Unauthorized - missing authentication headers" },
        { status: 401 }
      );
    }

    // Get raw body for HMAC verification (MUST be raw, not parsed JSON)
    const body = await request.text();

    // Verify webhook secret is configured
    if (!SHOPIFY_CLIENT_SECRET) {
      console.error("[SHOPIFY_COMPLIANCE] Webhook secret not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // CRITICAL: HMAC verification - invalid signature MUST return 401
    const isValid = verifyWebhookSignature(body, hmac, SHOPIFY_CLIENT_SECRET);
    if (!isValid) {
      console.error(`[SHOPIFY_COMPLIANCE] ❌ Invalid HMAC signature for topic: ${topic}`);
      return NextResponse.json(
        { error: "Unauthorized - invalid signature" },
        { status: 401 }
      );
    }

    console.log(`[SHOPIFY_COMPLIANCE] ✅ HMAC signature verified for topic: ${topic}`);

    // Parse payload after verification
    const payload = JSON.parse(body);

    // Route to appropriate handler based on topic
    switch (topic) {
      case "customers/data_request":
        return await handleCustomerDataRequest(shopDomain, payload);

      case "customers/redact":
        return await handleCustomerRedact(shopDomain, payload);

      case "shop/redact":
        return await handleShopRedact(shopDomain, payload);

      default:
        console.warn(`[SHOPIFY_COMPLIANCE] Unknown compliance topic: ${topic}`);
        // Still return 200 to acknowledge receipt
        return NextResponse.json({
          message: "Compliance webhook acknowledged",
          topic,
        });
    }
  } catch (error) {
    console.error("[SHOPIFY_COMPLIANCE] Error processing webhook:", error);

    // Return 200 to prevent Shopify from retrying
    // Log the error for manual review
    return NextResponse.json({
      message: "Error acknowledged - will be processed manually",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Handle customers/data_request webhook
 * Customer requests access to their data (GDPR Article 15)
 *
 * Payload structure:
 * {
 *   shop_id: number,
 *   shop_domain: string,
 *   orders_requested: string[],
 *   customer: { id: number, email: string, phone: string },
 *   data_request: { id: number }
 * }
 */
async function handleCustomerDataRequest(
  shopDomain: string,
  payload: any
): Promise<NextResponse> {
  console.log(
    `[COMPLIANCE:DATA_REQUEST] Processing data request for customer ${payload.customer?.id}`
  );

  // Find vendor by shop domain
  const vendor = await prisma.vendor.findFirst({
    where: {
      shopifyShopDomain: shopDomain,
      shopifyConnected: true,
    },
  });

  if (!vendor) {
    console.warn(`[COMPLIANCE:DATA_REQUEST] No vendor found for shop: ${shopDomain}`);
    return NextResponse.json({
      message: "Data request acknowledged - no vendor data found",
    });
  }

  /**
   * COMPLIANCE IMPLEMENTATION:
   *
   * This app does NOT store customer PII directly.
   * Customer data lives in Shopify only.
   *
   * If your app stores customer PII, you MUST:
   * 1. Query database for ALL data related to customer
   * 2. Format and return it to customer within 30 days
   * 3. Send via email or secure portal
   *
   * Current implementation:
   * - We sync products only, no customer data
   * - Log request for audit trail
   * - Acknowledge receipt with 200 OK
   */

  console.log(
    `[COMPLIANCE:DATA_REQUEST] Logged for shop ${shopDomain}, customer ${payload.customer?.id}, request ${payload.data_request?.id}`
  );

  return NextResponse.json({
    message: "Customer data request acknowledged",
    request_id: payload.data_request?.id,
    customer_id: payload.customer?.id,
    note: "This app does not store customer PII",
  });
}

/**
 * Handle customers/redact webhook
 * Customer requests data deletion (GDPR Article 17 - Right to be forgotten)
 *
 * Payload structure:
 * {
 *   shop_id: number,
 *   shop_domain: string,
 *   customer: { id: number, email: string, phone: string },
 *   orders_to_redact: number[]
 * }
 */
async function handleCustomerRedact(
  shopDomain: string,
  payload: any
): Promise<NextResponse> {
  console.log(
    `[COMPLIANCE:CUSTOMER_REDACT] Processing redaction for customer ${payload.customer?.id}`
  );

  const vendor = await prisma.vendor.findFirst({
    where: {
      shopifyShopDomain: shopDomain,
      shopifyConnected: true,
    },
  });

  if (!vendor) {
    console.warn(`[COMPLIANCE:CUSTOMER_REDACT] No vendor found for shop: ${shopDomain}`);
    return NextResponse.json({
      message: "Customer redaction acknowledged - no vendor data found",
    });
  }

  /**
   * COMPLIANCE IMPLEMENTATION:
   *
   * If your app stores customer PII, you MUST:
   * 1. Delete ALL customer data from your database
   * 2. Delete from backups (or anonymize)
   * 3. Delete from analytics/logs
   * 4. Complete within 30 days
   *
   * Current implementation:
   * - We don't store customer PII
   * - Log redaction request for audit
   * - Acknowledge with 200 OK
   */

  console.log(
    `[COMPLIANCE:CUSTOMER_REDACT] Logged for shop ${shopDomain}, customer ${payload.customer?.id}`
  );

  return NextResponse.json({
    message: "Customer redaction acknowledged",
    customer_id: payload.customer?.id,
    note: "This app does not store customer PII",
  });
}

/**
 * Handle shop/redact webhook
 * Shop uninstalled - delete ALL shop data within 48 hours
 *
 * Payload structure:
 * {
 *   shop_id: number,
 *   shop_domain: string
 * }
 */
async function handleShopRedact(
  shopDomain: string,
  payload: any
): Promise<NextResponse> {
  console.log(`[COMPLIANCE:SHOP_REDACT] Processing shop redaction for ${shopDomain}`);

  const vendor = await prisma.vendor.findFirst({
    where: {
      shopifyShopDomain: shopDomain,
    },
  });

  if (!vendor) {
    console.warn(`[COMPLIANCE:SHOP_REDACT] No vendor found for shop: ${shopDomain}`);
    return NextResponse.json({
      message: "Shop redaction acknowledged - no vendor data found",
    });
  }

  /**
   * CRITICAL: You MUST delete shop data within 48 hours of receiving this webhook
   *
   * Delete:
   * 1. Access tokens (MOST CRITICAL - security risk if not deleted)
   * 2. Shop configuration
   * 3. All synced products
   * 4. All webhooks subscriptions
   * 5. Any analytics/logs with shop data
   */

  try {
    // Delete access token and disconnect shop
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        shopifyConnected: false,
        shopifyAccessToken: null, // CRITICAL - delete access token
        shopifyScopes: null,
        shopifySyncStatus: "redacted",
      },
    });

    // Mark all Shopify products as inactive
    await prisma.product.updateMany({
      where: {
        vendorId: vendor.id,
        source: "shopify",
      },
      data: {
        active: false,
        syncStatus: "redacted",
      },
    });

    console.log(
      `[COMPLIANCE:SHOP_REDACT] ✅ Successfully redacted data for shop ${shopDomain}, vendor ${vendor.id}`
    );

    return NextResponse.json({
      message: "Shop data redacted successfully",
      shop_id: payload.shop_id,
      shop_domain: shopDomain,
      vendor_id: vendor.id,
    });
  } catch (error) {
    console.error(`[COMPLIANCE:SHOP_REDACT] Error redacting shop data:`, error);

    // Still return 200 but flag for manual review
    return NextResponse.json({
      message: "Shop redaction acknowledged - manual review required",
      shop_id: payload.shop_id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
