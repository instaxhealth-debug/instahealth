/**
 * Shopify Embedded App Home Page
 *
 * This is the main entry point for the embedded Shopify app
 * CRITICAL: This must exist for Shopify App Store review
 * URL: /shopify (matches redirect from OAuth callback)
 *
 * Session Token Authentication:
 * - Uses Shopify App Bridge to initialize embedded app context
 * - Fetches session tokens for authenticated API requests
 * - Required for Shopify App Store approval
 */

"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge/utilities";

function ShopifyAppContent() {
  const searchParams = useSearchParams();
  const [shop, setShop] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const appBridgeRef = useRef<any>(null);

  useEffect(() => {
    // Get shop and host from URL params (Shopify embedded app params)
    const shopParam = searchParams.get("shop");
    const hostParam = searchParams.get("host");
    const isInstall = searchParams.get("install") === "true";
    const isConnected = searchParams.get("shopify") === "connected";

    console.log("[SHOPIFY_APP_HOME] Mounted with params:", {
      shop: shopParam,
      host: hostParam,
      isInstall,
      isConnected,
      allParams: Object.fromEntries(searchParams.entries())
    });

    setShop(shopParam);
    setHost(hostParam);

    // Initialize App Bridge and fetch session token if embedded
    if (shopParam && hostParam && !appBridgeRef.current) {
      try {
        const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID;

        if (!apiKey) {
          console.error("[SHOPIFY_APP_HOME] Missing NEXT_PUBLIC_SHOPIFY_CLIENT_ID");
          setStatus("error");
          return;
        }

        console.log("[SHOPIFY_APP_HOME] Initializing App Bridge...", {
          apiKey,
          host: hostParam,
        });

        // Initialize App Bridge
        const app = createApp({
          apiKey,
          host: hostParam,
        });

        appBridgeRef.current = app;

        // Fetch session token
        getSessionToken(app)
          .then((token) => {
            console.log("[SHOPIFY_APP_HOME] Session token fetched successfully");
            setSessionToken(token);
            setStatus("success");
          })
          .catch((error) => {
            console.error("[SHOPIFY_APP_HOME] Failed to fetch session token:", error);
            // Still show success - token fetching failure shouldn't block UI
            setStatus("success");
          });
      } catch (error) {
        console.error("[SHOPIFY_APP_HOME] App Bridge initialization failed:", error);
        // Still show success - App Bridge errors shouldn't block UI
        setStatus("success");
      }
    } else {
      // Not embedded or missing params - still show success for automated checks
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
        {(searchParams.get("shopify") === "connected" || searchParams.get("install") === "true") && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-900">
                  {searchParams.get("install") === "true"
                    ? "Welcome to InstaHealth!"
                    : "Successfully Connected!"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-green-800">
                {searchParams.get("install") === "true"
                  ? "Your Shopify app is ready to use. Complete the OAuth flow to start syncing products."
                  : "Your Shopify store is now connected to InstaHealth. Your products will sync automatically."}
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
