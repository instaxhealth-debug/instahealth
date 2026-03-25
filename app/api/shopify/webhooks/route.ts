/**
 * Shopify Webhooks Handler
 *
 * Handles Shopify webhook events with HMAC signature verification
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyWebhookSignature } from "@/lib/shopify/client";
import { syncShopifyProduct, deleteShopifyProduct } from "@/lib/shopify/sync-service";
import { prisma } from "@/lib/prisma";
import type { ShopifyWebhookPayload } from "@/lib/shopify/types";

// ✅ FIX: Shopify uses CLIENT_SECRET to sign webhooks (not a separate webhook secret)
// Use SHOPIFY_CLIENT_SECRET directly for webhook HMAC verification
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const headersList = headers();
    const topic = headersList.get("x-shopify-topic");
    const hmac = headersList.get("x-shopify-hmac-sha256");
    const shopDomain = headersList.get("x-shopify-shop-domain");
    const contentType = headersList.get("content-type");

    if (!topic || !hmac || !shopDomain) {
      // CRITICAL: Missing HMAC must return 401 (not 400) per Shopify requirements
      return NextResponse.json(
        { error: "Unauthorized - missing authentication headers" },
        { status: 401 }
      );
    }

    // ✅ SECURITY FIX: Validate Content-Type to prevent content-type confusion attacks
    if (!contentType || !contentType.includes("application/json")) {
      console.error(`Invalid Content-Type: ${contentType}`);
      return NextResponse.json({ error: "Invalid Content-Type" }, { status: 400 });
    }

    // Get raw body for signature verification
    const body = await request.text();

    // Verify webhook signature BEFORE parsing JSON
    if (!SHOPIFY_WEBHOOK_SECRET) {
      console.error("[WEBHOOK_VERIFY] Webhook secret not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    console.log(`[WEBHOOK_VERIFY] Verifying signature for topic: ${topic}, shop: ${shopDomain}, body length: ${body.length} bytes`);
    const isValid = verifyWebhookSignature(body, hmac, SHOPIFY_WEBHOOK_SECRET);
    if (!isValid) {
      console.error(`[WEBHOOK_VERIFY] ❌ Signature verification failed for topic: ${topic}, shop: ${shopDomain}, body length: ${body.length} bytes`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.log(`[WEBHOOK_VERIFY] ✅ Signature verified for topic: ${topic}, shop: ${shopDomain}`);

    // Parse webhook payload
    const payload: ShopifyWebhookPayload = JSON.parse(body);

    // Find vendor by shop domain
    const vendor = await prisma.vendor.findFirst({
      where: {
        shopifyShopDomain: shopDomain,
        shopifyConnected: true,
      },
    });

    if (!vendor) {
      console.error(`No vendor found for shop: ${shopDomain}`);
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Handle webhook event
    console.log(`Processing webhook: ${topic} for vendor ${vendor.id}`);

    switch (topic) {
      case "products/create":
      case "products/update":
        // Re-sync the product
        const productId = String(payload.id);
        await syncShopifyProduct(vendor.id, productId);
        break;

      case "products/delete":
        // Delete the product from database
        const deletedProductId = String(payload.id);
        await deleteShopifyProduct(vendor.id, deletedProductId);
        break;

      case "inventory_levels/update":
        // Re-sync the product that had inventory updated
        if (payload.inventory_item_id) {
          // Find product by inventory item
          const product = await prisma.product.findFirst({
            where: {
              vendorId: vendor.id,
              externalVariantId: String(payload.inventory_item_id),
            },
          });

          if (product && product.externalId) {
            await syncShopifyProduct(vendor.id, product.externalId);
          }
        }
        break;

      case "app/uninstalled":
        // Disconnect Shopify integration
        await prisma.vendor.update({
          where: { id: vendor.id },
          data: {
            shopifyConnected: false,
            shopifyAccessToken: null,
            shopifySyncStatus: "disconnected",
          },
        });

        // Optionally: mark all Shopify products as inactive
        await prisma.product.updateMany({
          where: {
            vendorId: vendor.id,
            source: "shopify",
          },
          data: {
            active: false,
            syncStatus: "disconnected",
          },
        });
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
