/**
 * Manual Shopify Sync API Route
 *
 * Allows vendors to manually trigger a full product sync
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { syncShopifyProducts } from "@/lib/shopify/sync-service";

export async function POST(request: NextRequest) {
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
        shopifyConnected: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: "No Shopify-connected vendor found" },
        { status: 404 }
      );
    }

    // Check if already syncing
    if (vendor.shopifySyncStatus === "syncing") {
      return NextResponse.json(
        { error: "Sync already in progress" },
        { status: 409 }
      );
    }

    // Trigger sync
    const result = await syncShopifyProducts(vendor.id);

    return NextResponse.json({
      success: result.success,
      productsProcessed: result.productsProcessed,
      productsCreated: result.productsCreated,
      productsUpdated: result.productsUpdated,
      productsSkipped: result.productsSkipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Manual sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
