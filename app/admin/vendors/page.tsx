import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";

export const dynamic = 'force-dynamic';

async function createVendor(formData: FormData) {
  "use server";
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const status = (formData.get("status") as string) || "active";
  const legalEntityName = (formData.get("legalEntityName") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || null;
  const licenseNumber = (formData.get("licenseNumber") as string)?.trim() || null;
  const logoUrl = (formData.get("logoUrl") as string)?.trim() || null;
  const tagline = (formData.get("tagline") as string)?.trim() || null;
  const rating = formData.get("rating") ? parseFloat(formData.get("rating") as string) : null;
  const ratingCount = formData.get("ratingCount") ? parseInt(formData.get("ratingCount") as string) : null;
  const isHouseBrand = formData.get("isHouseBrand") === "on";
  const complianceAccepted = formData.get("complianceAccepted") === "on";

  if (!name || !email) {
    throw new Error("Name and email are required");
  }

  const baseSlug = generateSlug(name);
  const slug = await generateUniqueSlug(baseSlug, async (candidate) => {
    const existing = await prisma.vendor.findUnique({ where: { slug: candidate } });
    return !!existing;
  });

  // Enforce: vendor cannot be active unless complianceAccepted
  const finalStatus = status === "active" && !complianceAccepted ? "inactive" : status;

  await prisma.vendor.create({
    data: {
      name,
      slug,
      email,
      status: finalStatus,
      legalEntityName,
      country,
      licenseNumber,
      complianceAccepted,
      complianceAcceptedAt: complianceAccepted ? new Date() : null,
      logoUrl,
      tagline,
      rating,
      ratingCount,
      isHouseBrand,
    },
  });

  revalidatePath("/admin/vendors");
}

export default async function VendorsPage() {
  await requireAdmin();

  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      products: {
        where: { active: true, inStock: true },
        include: { locations: true },
      },
      _count: { select: { products: true } },
    },
  });

  // For each vendor, count unique active locations
  const vendorStats = vendors.map((vendor) => {
    const locationSet = new Set<string>();
    for (const product of vendor.products) {
      if (product.isGlobal) {
        return { vendorId: vendor.id, activeProductCount: vendor.products.length, activeLocations: "All" };
      }
      for (const loc of product.locations) {
        locationSet.add(loc.locationId);
      }
    }
    return {
      vendorId: vendor.id,
      activeProductCount: vendor.products.length,
      activeLocations: locationSet.size > 0 ? locationSet.size : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vendors</h1>
        <p className="text-sm text-gray-600">Manage vendor records.</p>
      </div>

      <form action={createVendor} className="rounded border bg-white p-4 space-y-3">
        <div className="font-semibold">Create Vendor</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm space-y-1 sm:col-span-1">
            <span className="block">Name *</span>
            <input name="name" required className="w-full rounded border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm space-y-1 sm:col-span-1">
            <span className="block">Email *</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="vendor@email.com"
            />
          </label>
          <label className="text-sm space-y-1 sm:col-span-1">
            <span className="block">Status</span>
            <select name="status" defaultValue="active" className="w-full rounded border px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="text-sm space-y-1 sm:col-span-1">
            <span className="block">Legal Entity Name</span>
            <input name="legalEntityName" className="w-full rounded border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm space-y-1 sm:col-span-1">
            <span className="block">Country</span>
            <input name="country" className="w-full rounded border px-3 py-2 text-sm" placeholder="e.g. UAE" />
          </label>
          <label className="text-sm space-y-1 sm:col-span-1">
            <span className="block">License Number</span>
            <input name="licenseNumber" className="w-full rounded border px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-3 space-y-1">
            <label className="text-sm font-medium">Logo URL</label>
            <input
              name="logoUrl"
              placeholder="/logos/pepz.png"
              className="w-full rounded border px-3 py-2"
            />
            <p className="text-xs text-gray-500">
              Use a public path like /logos/pepz.png
            </p>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm font-medium">Tagline</label>
            <input
              name="tagline"
              placeholder="Everything Peptides"
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="sm:col-span-1 space-y-1">
            <label className="text-sm font-medium">Rating</label>
            <input
              name="rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              placeholder="5.0"
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="sm:col-span-1 space-y-1">
            <label className="text-sm font-medium">Rating Count</label>
            <input
              name="ratingCount"
              type="number"
              min="0"
              placeholder="500"
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="sm:col-span-3 flex items-center gap-2">
            <input type="checkbox" name="isHouseBrand" className="rounded" />
            <label className="text-sm">Home Brand</label>
          </div>
          <label className="text-sm space-y-1 sm:col-span-3 flex items-center gap-2">
            <input type="checkbox" name="complianceAccepted" className="rounded" />
            <span>Compliance terms accepted</span>
          </label>
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm font-semibold text-white">
          Create
        </button>
      </form>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3 font-semibold">All Vendors</div>
        <div className="divide-y">
          {vendors.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-600">No vendors yet.</div>
          ) : (
            vendors.map((vendor) => (
              <div key={vendor.id} className="px-4 py-3 text-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold">{vendor.name}</div>
                  <div className="text-gray-600 text-xs">
                    {vendor.email ? `${vendor.email} • ` : ""}
                    Status: {vendor.status}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    Products: {vendor._count.products} •{" "}
                    {(() => {
                      const stat = vendorStats.find((s) => s.vendorId === vendor.id);
                      return stat
                        ? `Active+InStock: ${stat.activeProductCount} • Locations: ${typeof stat.activeLocations === "string" ? stat.activeLocations : stat.activeLocations}`
                        : "-";
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">{new Date(vendor.createdAt).toLocaleDateString()}</div>
                  <a
                    href={`/admin/vendors/${vendor.id}/edit`}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
