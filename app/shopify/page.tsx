/**
 * Shopify Embedded App Home Page
 *
 * This is the main entry point for the embedded Shopify app
 * CRITICAL: This must exist for Shopify App Store review
 * URL: /shopify (matches redirect from OAuth callback)
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ShopifyAppContent() {
  const searchParams = useSearchParams();
  const [shop, setShop] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    // Get shop and host from URL params (Shopify embedded app params)
    const shopParam = searchParams.get("shop");
    const hostParam = searchParams.get("host");

    console.log("[SHOPIFY_APP_HOME] Mounted with params:", {
      shop: shopParam,
      host: hostParam,
      allParams: Object.fromEntries(searchParams.entries())
    });

    setShop(shopParam);
    setHost(hostParam);

    // Check if this is post-install
    if (searchParams.get("shopify") === "connected") {
      setStatus("success");
    } else {
      setStatus("success");
    }
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading Shopify app...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">InstaHealth Product Sync</h1>
          <p className="text-gray-600">
            Sync your Shopify products to InstaHealth marketplace
          </p>
          {shop && (
            <p className="text-sm text-gray-500 mt-2">
              Connected shop: <span className="font-medium">{shop}</span>
            </p>
          )}
        </div>

        {/* Success message */}
        {searchParams.get("shopify") === "connected" && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-900">Successfully Connected!</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-green-800">
                Your Shopify store is now connected to InstaHealth. Your products will sync
                automatically.
              </p>
            </CardContent>
          </Card>
        )}

        {/* App features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Sync
              </CardTitle>
              <CardDescription>
                Automatic synchronization of your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Products sync automatically after connection</li>
                <li>• Real-time updates via webhooks</li>
                <li>• Inventory tracking</li>
                <li>• Image and variant support</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Manage Products
              </CardTitle>
              <CardDescription>
                Control your InstaHealth presence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Manage your synced products in the InstaHealth vendor dashboard.
              </p>
              <Button
                onClick={() => {
                  // Open vendor dashboard in new tab (outside embedded context)
                  window.open("/vendor/dashboard", "_blank");
                }}
                variant="outline"
                size="sm"
              >
                Open Vendor Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help card */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Products not syncing?</p>
                <p className="text-sm text-gray-600">
                  Check your vendor dashboard for sync status and errors.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Contact Support</p>
                <p className="text-sm text-gray-600">
                  Email: info@instahealth.ae
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug info (only show in development) */}
        {process.env.NODE_ENV === "development" && (
          <Card className="border-gray-300 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(
                  {
                    shop,
                    host,
                    params: Object.fromEntries(searchParams.entries()),
                  },
                  null,
                  2
                )}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ShopifyAppHome() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading Shopify app...</p>
          </div>
        </div>
      }
    >
      <ShopifyAppContent />
    </Suspense>
  );
}
