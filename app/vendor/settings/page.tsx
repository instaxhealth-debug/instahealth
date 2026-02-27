import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorSettingsForm } from "./settings-form";

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
    },
  });

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Vendor not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Vendor Settings</h1>
        <p className="text-muted-foreground">
          Manage your vendor profile and delivery settings
        </p>
      </div>

      {/* Basic Info (Read-Only) */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Vendor Name
              </label>
              <p className="text-base">{vendor.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Slug
              </label>
              <p className="text-base">{vendor.slug}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p className="text-base">{vendor.email || "Not set"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <p className="text-base">
                {vendor.status === "active" ? "✅ Active" : "❌ Inactive"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Settings */}
      <VendorSettingsForm vendor={vendor} />
    </div>
  );
}
