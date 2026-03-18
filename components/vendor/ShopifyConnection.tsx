"use client";

/**
 * Shopify Connection Component
 *
 * Vendor dashboard UI for managing Shopify integration
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, RefreshCw, Unplug, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ShopifyConnectionProps {
  vendor: {
    id: string;
    shopifyConnected: boolean;
    shopifyShopDomain: string | null;
    shopifyLastSyncAt: Date | null;
    shopifySyncStatus: string | null;
  };
  productCount: {
    total: number;
    shopify: number;
  };
}

export function ShopifyConnection({ vendor, productCount }: ShopifyConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    const shop = prompt("Enter your Shopify store domain (e.g., yourstore.myshopify.com):");
    if (!shop) return;

    setIsConnecting(true);
    window.location.href = `/api/shopify/connect?shop=${encodeURIComponent(shop)}`;
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/shopify/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      toast.success(
        `Sync completed! ${data.productsCreated} created, ${data.productsUpdated} updated`
      );

      // Reload page to show updated stats
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect Shopify? Your products will be deactivated."
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/shopify/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepProducts: false }),
      });

      if (!response.ok) {
        throw new Error("Disconnect failed");
      }

      toast.success("Shopify disconnected");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error("Failed to disconnect Shopify");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            <CardTitle>Shopify Integration</CardTitle>
          </div>
          {vendor.shopifyConnected && (
            <Badge variant={vendor.shopifySyncStatus === "syncing" ? "default" : "secondary"}>
              {vendor.shopifySyncStatus === "syncing" ? "Syncing..." : "Connected"}
            </Badge>
          )}
        </div>
        <CardDescription>
          {vendor.shopifyConnected
            ? "Sync products from your Shopify store"
            : "Connect your Shopify store to automatically import products"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!vendor.shopifyConnected ? (
          <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Store className="mr-2 h-4 w-4" />
                Connect Shopify Store
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Store Info */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Store:</span>
                <a
                  href={`https://${vendor.shopifyShopDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {vendor.shopifyShopDomain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Products Synced:</span>
                <span className="text-sm">{productCount.shopify}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Sync:</span>
                <span className="text-sm">
                  {vendor.shopifyLastSyncAt
                    ? new Date(vendor.shopifyLastSyncAt).toLocaleString()
                    : "Never"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing || vendor.shopifySyncStatus === "syncing"}
                className="flex-1"
              >
                {isSyncing || vendor.shopifySyncStatus === "syncing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>

              <Button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                variant="outline"
                className="flex-1"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unplug className="mr-2 h-4 w-4" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground">
              Products are automatically synced via webhooks when you update them in Shopify. Use
              &quot;Sync Now&quot; to manually refresh all products.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
