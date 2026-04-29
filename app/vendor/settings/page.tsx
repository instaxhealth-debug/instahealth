import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VendorSettingsForm } from "./settings-form";
import { ShopifyConnection } from "@/components/vendor/ShopifyConnection";
import { Store, User, CheckCircle2, AlertCircle, Info } from "lucide-react";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function VendorSettings() {
  const vendor_context = await getVendorContext();

  // Fetch full vendor data
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendor_context.vendorId },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      logoUrl: true,
      tagline: true,
      bookingUrl: true,
      bookingInstructions: true,
      serviceRadiusKm: true,
      enforceServiceRadius: true,
      allowOutOfRadiusOverride: true,
      baseLat: true,
      baseLng: true,
      baseAddressFormatted: true,
      verified: true,
      status: true,
      shopifyConnected: true,
      shopifyShopDomain: true,
      shopifyLastSyncAt: true,
      shopifySyncStatus: true,
    },
  });

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Vendor not found</p>
      </div>
    );
  }

  const productCounts = await Promise.all([
    prisma.product.count({
      where: { vendorId: vendor_context.vendorId },
    }),
    prisma.product.count({
      where: { vendorId: vendor_context.vendorId, source: "shopify" },
    }),
  ]).then(([total, shopify]) => ({ total, shopify }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Settings</h1>
        <p className="text-gray-600">
          Manage your vendor profile, storefront details, delivery settings, and integrations.
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* LEFT MAIN COLUMN (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Profile Card */}
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#41a59b]/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-[#41a59b]" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Store Profile</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Your vendor identity and storefront details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Preview */}
              {vendor.logoUrl && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-white border border-gray-200">
                    <Image
                      src={vendor.logoUrl}
                      alt={`${vendor.name} logo`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Store Logo</p>
                    <p className="text-xs text-gray-500 mt-0.5">Displayed on your storefront and products</p>
                  </div>
                </div>
              )}

              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Vendor Name
                  </label>
                  <p className="text-base font-medium text-gray-900 mt-1">{vendor.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Store Slug
                  </label>
                  <p className="text-base font-mono text-gray-900 mt-1">{vendor.slug}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Email
                  </label>
                  <p className="text-base text-gray-900 mt-1">{vendor.email || "Not set"}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </label>
                  <div className="mt-1">
                    {vendor.status === "active" ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 border-gray-200 font-semibold">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {vendor.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {vendor.tagline && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tagline
                  </label>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {vendor.tagline}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editable Settings */}
          <VendorSettingsForm vendor={vendor} />

          {/* Integrations Section */}
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Integrations</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Connect external platforms to manage your products
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ShopifyConnection vendor={vendor} productCount={productCounts} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDEBAR (1/3 width) */}
        <div className="space-y-6">
          {/* Vendor Preview Card */}
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">Vendor Preview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-[#41a59b]/5 to-blue-500/5 rounded-xl border border-[#41a59b]/20">
                {vendor.logoUrl ? (
                  <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-white border border-gray-200 mb-3 mx-auto">
                    <Image
                      src={vendor.logoUrl}
                      alt={`${vendor.name} logo`}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center mb-3 mx-auto">
                    <Store className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-center">{vendor.name}</h3>
                {vendor.tagline && (
                  <p className="text-xs text-gray-600 text-center mt-1">{vendor.tagline}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className="text-xs text-gray-500">Store:</span>
                  <code className="text-xs font-mono text-[#41a59b] bg-white px-2 py-0.5 rounded">{vendor.slug}</code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status Card */}
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Vendor Active</p>
                  <p className="text-xs text-gray-500 mt-0.5">Your store is live and accepting orders</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Profile Complete</p>
                  <p className="text-xs text-gray-500 mt-0.5">All required information is set</p>
                </div>
              </div>
              {vendor.verified && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#41a59b] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Verified Vendor</p>
                    <p className="text-xs text-gray-500 mt-0.5">Your account has been verified</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="bg-blue-50 rounded-2xl shadow-sm border border-blue-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base font-semibold text-blue-900">Need Help?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-800">
                Contact support if you need to update your vendor name, slug, or verified status.
              </p>
              <div className="text-xs text-blue-700 bg-blue-100/50 p-3 rounded-lg">
                <strong>Note:</strong> Some fields are managed by administrators to maintain data integrity.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
