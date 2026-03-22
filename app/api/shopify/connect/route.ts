/**
 * Shopify OAuth Connect Route
 *
 * Initiates Shopify OAuth flow by redirecting to Shopify authorization URL
 * ✅ SECURITY FIX: Server-generated cryptographic nonce for state parameter
 * ✅ AUTH FIX: Use auth() instead of broken getServerSession() wrapper
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_SCOPES = "read_products,read_inventory,read_orders";

// ✅ FIX: Use correct env var (NEXT_PUBLIC_BASE_URL) with fallback chain
// Priority: SHOPIFY_REDIRECT_URI (explicit) > NEXT_PUBLIC_APP_URL > NEXT_PUBLIC_BASE_URL > NEXTAUTH_URL
const BASE_URL =
  process.env.SHOPIFY_REDIRECT_URI?.replace(/\/api\/shopify\/callback$/, "") ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

const SHOPIFY_REDIRECT_URI = BASE_URL + "/api/shopify/callback";

export async function GET(request: NextRequest) {
  try {
    // Check authentication - use auth() from NextAuth v5
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[SHOPIFY_CONNECT] Auth failed - no session or user ID");
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

    // 🔍 DIAGNOSTIC LOGGING: Log exact redirect_uri being generated
    console.log("[SHOPIFY_CONNECT] ===== OAUTH DIAGNOSTICS =====");
    console.log("[SHOPIFY_CONNECT] shop =", shop);
    console.log("[SHOPIFY_CONNECT] BASE_URL =", BASE_URL);
    console.log("[SHOPIFY_CONNECT] SHOPIFY_REDIRECT_URI =", SHOPIFY_REDIRECT_URI);
    console.log("[SHOPIFY_CONNECT] vendorId =", vendor.id);
    console.log("[SHOPIFY_CONNECT] nonce =", nonce);
    console.log("[SHOPIFY_CONNECT] ================================");

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

    // 🔍 DIAGNOSTIC LOGGING: Log complete authorization URL
    console.log("[SHOPIFY_CONNECT] Full authorization URL:", authUrl.toString());

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
