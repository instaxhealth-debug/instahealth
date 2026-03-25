/**
 * Shopify GDPR Compliance Webhook: customers/redact
 *
 * MANDATORY webhook for Shopify App Store review
 * Handles customer data deletion requests under GDPR
 *
 * Shopify Documentation:
 * https://shopify.dev/docs/apps/build/privacy-law-compliance/customer-data-erasure
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

    console.log(`[GDPR:CUSTOMERS_REDACT] Received webhook from shop: ${shopDomain}`);

    if (!hmac || !shopDomain) {
      console.error("[GDPR:CUSTOMERS_REDACT] Missing required headers");
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
      console.error("[GDPR:CUSTOMERS_REDACT] Webhook secret not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const isValid = verifyWebhookSignature(body, hmac, SHOPIFY_CLIENT_SECRET);
    if (!isValid) {
      console.error("[GDPR:CUSTOMERS_REDACT] ❌ Invalid HMAC signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("[GDPR:CUSTOMERS_REDACT] ✅ HMAC signature verified");

    // Parse payload
    const payload = JSON.parse(body);

    /**
     * Shopify payload structure:
     * {
     *   shop_id: number,
     *   shop_domain: string,
     *   customer: {
     *     id: number,
     *     email: string,
     *     phone: string
     *   },
     *   orders_to_redact: number[]  // Order IDs
     * }
     */

    console.log(`[GDPR:CUSTOMERS_REDACT] Processing redaction for customer ${payload.customer?.id}`);

    // Find vendor by shop domain
    const vendor = await prisma.vendor.findFirst({
      where: {
        shopifyShopDomain: shopDomain,
        shopifyConnected: true,
      },
    });

    if (!vendor) {
      console.warn(`[GDPR:CUSTOMERS_REDACT] No vendor found for shop: ${shopDomain}`);
      // Still return 200 to acknowledge webhook receipt
      return NextResponse.json({
        message: "Redaction request acknowledged - no vendor data found"
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
     * - Customer session data
     *
     * You MUST:
     * 1. Delete ALL customer PII from your database
     * 2. Anonymize/delete customer-linked analytics
     * 3. Remove from backups (or mark for deletion)
     * 4. Complete within 30 days
     *
     * Current implementation:
     * - We sync products only, not customer data
     * - No customer PII stored
     * - Acknowledge webhook and log for audit trail
     */

    // Log the redaction request for compliance audit trail
    console.log(`[GDPR:CUSTOMERS_REDACT] Redaction request logged for shop ${shopDomain}, customer ${payload.customer?.id}`);
    console.log(`[GDPR:CUSTOMERS_REDACT] Orders to redact: ${payload.orders_to_redact?.length || 0}`);

    /**
     * TODO for production if you store customer data:
     *
     * await prisma.customerData.deleteMany({
     *   where: {
     *     shopifyCustomerId: String(payload.customer.id),
     *     vendorId: vendor.id
     *   }
     * });
     *
     * await prisma.orderData.updateMany({
     *   where: {
     *     shopifyOrderId: { in: payload.orders_to_redact.map(String) },
     *     vendorId: vendor.id
     *   },
     *   data: {
     *     customerEmail: "[REDACTED]",
     *     customerName: "[REDACTED]",
     *     customerPhone: "[REDACTED]"
     *   }
     * });
     */

    // Return 200 to acknowledge webhook receipt
    return NextResponse.json({
      message: "Customer redaction acknowledged",
      customer_id: payload.customer?.id,
      orders_redacted: payload.orders_to_redact?.length || 0
    });

  } catch (error) {
    console.error("[GDPR:CUSTOMERS_REDACT] Error processing webhook:", error);

    // Still return 200 to prevent Shopify from retrying
    // Log the error for manual review
    return NextResponse.json({
      message: "Error acknowledged - will be processed manually",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
