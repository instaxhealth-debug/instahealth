/**
 * Shopify GDPR Compliance Webhook: customers/data_request
 *
 * MANDATORY webhook for Shopify App Store review
 * Handles customer data access requests under GDPR
 *
 * Shopify Documentation:
 * https://shopify.dev/docs/apps/build/privacy-law-compliance/customer-data-request
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

    console.log(`[GDPR:CUSTOMERS_DATA_REQUEST] Received webhook from shop: ${shopDomain}`);

    if (!hmac || !shopDomain) {
      console.error("[GDPR:CUSTOMERS_DATA_REQUEST] Missing required headers");
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
      console.error("[GDPR:CUSTOMERS_DATA_REQUEST] Webhook secret not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const isValid = verifyWebhookSignature(body, hmac, SHOPIFY_CLIENT_SECRET);
    if (!isValid) {
      console.error("[GDPR:CUSTOMERS_DATA_REQUEST] ❌ Invalid HMAC signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("[GDPR:CUSTOMERS_DATA_REQUEST] ✅ HMAC signature verified");

    // Parse payload
    const payload = JSON.parse(body);

    /**
     * Shopify payload structure:
     * {
     *   shop_id: number,
     *   shop_domain: string,
     *   orders_requested: string[],  // Order IDs
     *   customer: {
     *     id: number,
     *     email: string,
     *     phone: string
     *   },
     *   data_request: {
     *     id: number
     *   }
     * }
     */

    console.log(`[GDPR:CUSTOMERS_DATA_REQUEST] Processing data request for customer ${payload.customer?.id}`);

    // Find vendor by shop domain
    const vendor = await prisma.vendor.findFirst({
      where: {
        shopifyShopDomain: shopDomain,
        shopifyConnected: true,
      },
    });

    if (!vendor) {
      console.warn(`[GDPR:CUSTOMERS_DATA_REQUEST] No vendor found for shop: ${shopDomain}`);
      // Still return 200 to acknowledge webhook receipt
      return NextResponse.json({
        message: "Data request acknowledged - no vendor data found"
      });
    }

    /**
     * COMPLIANCE IMPLEMENTATION:
     *
     * This app does NOT store customer PII directly.
     * Customer data lives in Shopify only.
     *
     * If your app stores:
     * - Customer emails, names, addresses
     * - Order details with customer info
     * - Customer analytics/tracking data
     *
     * You MUST:
     * 1. Query your database for ALL data related to customer
     * 2. Format and return it to the customer
     * 3. Send via email or secure portal within 30 days
     *
     * Current implementation:
     * - We sync products only, not customer data
     * - No customer PII stored
     * - Acknowledge webhook and log for audit trail
     */

    // Log the request for compliance audit trail
    console.log(`[GDPR:CUSTOMERS_DATA_REQUEST] Data request logged for shop ${shopDomain}, customer ${payload.customer?.id}`);
    console.log(`[GDPR:CUSTOMERS_DATA_REQUEST] Request ID: ${payload.data_request?.id}`);

    /**
     * TODO for production:
     * - Implement actual customer data export if you store customer PII
     * - Send customer data via email or secure download link
     * - Log compliance action in audit table
     * - Maintain 6-year retention of GDPR requests
     */

    // Return 200 to acknowledge webhook receipt
    return NextResponse.json({
      message: "Customer data request acknowledged",
      request_id: payload.data_request?.id,
      customer_id: payload.customer?.id
    });

  } catch (error) {
    console.error("[GDPR:CUSTOMERS_DATA_REQUEST] Error processing webhook:", error);

    // Still return 200 to prevent Shopify from retrying
    // Log the error for manual review
    return NextResponse.json({
      message: "Error acknowledged - will be processed manually",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
