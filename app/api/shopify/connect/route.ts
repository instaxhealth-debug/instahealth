/**
 * Shopify OAuth Connect Route
 *
 * Initiates Shopify OAuth flow by redirecting to Shopify authorization URL
 * ✅ SECURITY FIX: Server-generated cryptographic nonce for state parameter
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_SCOPES = "read_products,read_inventory,read_orders";
const SHOPIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + "/api/shopify/callback";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get vendor for this user
    const vendor = await prisma.vendor.findFirst({
      where: {
        userId: session.user.id,
        status: "active",
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: "No active vendor found" }, { status: 404 });
    }

    // Get shop parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Missing 'shop' parameter (e.g., yourstore.myshopify.com)" },
        { status: 400 }
      );
    }

    // Validate shop domain format
    if (!shop.endsWith(".myshopify.com")) {
      return NextResponse.json(
        { error: "Invalid shop domain. Must be yourstore.myshopify.com" },
        { status: 400 }
      );
    }

    if (!SHOPIFY_CLIENT_ID) {
      return NextResponse.json(
        { error: "Shopify integration not configured" },
        { status: 500 }
      );
    }

    // ✅ SECURITY FIX: Generate cryptographically secure random nonce
    const nonce = crypto.randomBytes(32).toString("hex");

    // ✅ SECURITY FIX: Store nonce in database for single-use verification
    await prisma.shopifyOAuthState.create({
      data: {
        nonce,
        vendorId: vendor.id,
        timestamp: BigInt(Date.now()),
      },
    });

    // Build Shopify OAuth URL
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.set("client_id", SHOPIFY_CLIENT_ID);
    authUrl.searchParams.set("scope", SHOPIFY_SCOPES);
    authUrl.searchParams.set("redirect_uri", SHOPIFY_REDIRECT_URI);
    authUrl.searchParams.set("state", nonce); // ✅ Use nonce as state

    // Redirect to Shopify
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Shopify connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Shopify connection" },
      { status: 500 }
    );
  }
}
