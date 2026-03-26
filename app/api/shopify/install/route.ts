/**
 * Shopify Public Install Endpoint
 *
 * CRITICAL: This endpoint allows Shopify App Store installations WITHOUT requiring
 * an existing InstaHealth vendor account. This is REQUIRED for App Store approval.
 *
 * Flow:
 * 1. Merchant clicks "Install" in Shopify App Store
 * 2. Shopify redirects to this endpoint with ?shop=store.myshopify.com
 * 3. We initiate OAuth WITHOUT requiring InstaHealth login
 * 4. After OAuth, callback creates/links vendor account
 *
 * This fixes the "install from Shopify-owned surface" requirement.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_SCOPES = "read_products,read_inventory,read_orders";
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://instahealth.ae";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get("shop");

    // Validate shop parameter
    if (!shop) {
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
  <h1>Missing Shop Parameter</h1>
  <p>Please install the app from the Shopify App Store.</p>
</body>
</html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Validate shop domain format
    if (!shop.endsWith(".myshopify.com")) {
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
  <h1>Invalid Shop Domain</h1>
  <p>Shop must be a .myshopify.com domain.</p>
</body>
</html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    if (!SHOPIFY_CLIENT_ID) {
      console.error("[SHOPIFY_INSTALL] SHOPIFY_CLIENT_ID not configured");
      return NextResponse.json(
        { error: "Shopify integration not configured" },
        { status: 500 }
      );
    }

    // Generate cryptographically secure nonce
    const nonce = crypto.randomBytes(32).toString("hex");

    console.log("[SHOPIFY_INSTALL] ===== PUBLIC INSTALL INITIATED =====");
    console.log("[SHOPIFY_INSTALL] shop =", shop);
    console.log("[SHOPIFY_INSTALL] nonce =", nonce);
    console.log("[SHOPIFY_INSTALL] OAuth will proceed WITHOUT vendor auth");
    console.log("[SHOPIFY_INSTALL] ======================================");

    // Store nonce WITHOUT vendorId (will be linked in callback)
    // This allows install from App Store before InstaHealth account exists
    await prisma.shopifyOAuthState.create({
      data: {
        nonce,
        vendorId: null, // Will be set in callback after account creation/linking
        timestamp: BigInt(Date.now()),
      },
    });

    // Build Shopify OAuth URL
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.set("client_id", SHOPIFY_CLIENT_ID);
    authUrl.searchParams.set("scope", SHOPIFY_SCOPES);
    authUrl.searchParams.set("redirect_uri", `${BASE_URL}/api/shopify/callback`);
    authUrl.searchParams.set("state", nonce);

    console.log("[SHOPIFY_INSTALL] Redirecting to OAuth:", authUrl.toString());

    // Redirect to Shopify OAuth
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("[SHOPIFY_INSTALL] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate installation" },
      { status: 500 }
    );
  }
}
