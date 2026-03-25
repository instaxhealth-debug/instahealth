/**
 * Shopify Disconnect API Route
 *
 * Allows vendors to disconnect their Shopify store
 * ✅ AUTH FIX: Use auth() instead of broken getServerSession() wrapper
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAllWebhooks } from "@/lib/shopify/webhooks";

// Mark as dynamic route (uses auth() which reads headers)
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check authentication - use auth() from NextAuth v5
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[SHOPIFY_DISCONNECT] Auth failed - no session or user ID");
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
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // Parse request body for action
    const body = await request.json();
    const { keepProducts = false } = body;

    // ✅ DELETE WEBHOOKS: Clean up webhooks before disconnecting
    if (vendor.shopifyShopDomain && vendor.shopifyAccessToken) {
      console.log(`[SHOPIFY_DISCONNECT] Deleting webhooks for shop ${vendor.shopifyShopDomain}`);
      try {
        const deletedCount = await deleteAllWebhooks(
          vendor.shopifyShopDomain,
          vendor.shopifyAccessToken
        );
        console.log(`[SHOPIFY_DISCONNECT] ✅ Deleted ${deletedCount} webhooks`);
      } catch (webhookError) {
        console.error(
          `[SHOPIFY_DISCONNECT] ⚠️ Failed to delete webhooks:`,
          webhookError
        );
        // Continue with disconnect even if webhook deletion fails
      }
    }

    // Disconnect Shopify
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        shopifyConnected: false,
        shopifyAccessToken: null,
        shopifySyncStatus: "disconnected",
      },
    });

    // Optionally soft-delete Shopify products
    if (!keepProducts) {
      await prisma.product.updateMany({
        where: {
          vendorId: vendor.id,
          source: "shopify",
        },
        data: {
          active: false,
          published: false,
          syncStatus: "disconnected",
          deletedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { error: "Disconnect failed" },
      { status: 500 }
    );
  }
}
