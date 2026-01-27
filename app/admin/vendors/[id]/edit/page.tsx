import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function updateVendor(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = (formData.get("id") as string)?.trim();
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

  if (!id || !name || !email) {
    throw new Error("ID, name, and email are required");
  }

  const slug = (formData.get("slug") as string)?.trim();

  if (!slug) {
    throw new Error("Slug is required");
  }

  // Check slug uniqueness (allow keeping same slug for this vendor)
  const existing = await prisma.vendor.findUnique({ where: { slug } });
  if (existing && existing.id !== id) {
    throw new Error("Slug already in use by another vendor");
  }

  // Get current vendor to check compliance status
  const currentVendor = await prisma.vendor.findUnique({ where: { id } });
  if (!currentVendor) {
    throw new Error("Vendor not found");
  }

  // Enforce: vendor cannot be active unless complianceAccepted
  const finalStatus = status === "active" && !complianceAccepted ? "inactive" : status;

  await prisma.vendor.update({
    where: { id },
    data: {
      name,
      slug,
      email,
      status: finalStatus,
      legalEntityName,
      country,
      licenseNumber,
      complianceAccepted,
      complianceAcceptedAt:
        complianceAccepted && !currentVendor.complianceAccepted ? new Date() : currentVendor.complianceAcceptedAt,
      logoUrl,
      tagline,
      rating,
      ratingCount,
      isHouseBrand,
    },
  });

  revalidatePath("/admin/vendors");
  redirect("/admin/vendors");
}

async function deleteVendor(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = (formData.get("id") as string)?.trim();
  if (!id) {
    throw new Error("ID is required");
  }

  await prisma.vendor.delete({ where: { id } });

  revalidatePath("/admin/vendors");
  redirect("/admin/vendors");
}

export default async function EditVendorPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const vendor = await prisma.vendor.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (!vendor) {
    redirect("/admin/vendors");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit Vendor</h1>
          <p className="text-sm text-gray-600">Update vendor details or delete.</p>
        </div>
        <Link href="/admin/vendors" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to Vendors
        </Link>
      </div>

      <form action={updateVendor} className="rounded border bg-white p-6 space-y-4">
        <input type="hidden" name="id" value={vendor.id} />

        <div className="space-y-4">
          <label className="block text-sm space-y-2">
            <span className="font-medium">Name *</span>
            <input
              name="name"
              defaultValue={vendor.name}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm space-y-2">
            <span className="font-medium">Email *</span>
            <input
              name="email"
              type="email"
              defaultValue={vendor.email ?? ""}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm space-y-2">
            <span className="font-medium">URL Slug *</span>
            <input
              name="slug"
              defaultValue={vendor.slug}
              required
              className="w-full rounded border px-3 py-2 text-sm"
              pattern="[a-z0-9-]+"
              title="Only lowercase letters, numbers, and hyphens allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ Changing this breaks existing links. Use lowercase letters, numbers, and hyphens only.
            </p>
          </label>

          <label className="block text-sm space-y-2">
            <span className="font-medium">Status</span>
            <select
              name="status"
              defaultValue={vendor.status}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label className="block text-sm space-y-2">
            <span className="font-medium">Legal Entity Name</span>
            <input
              name="legalEntityName"
              defaultValue={vendor.legalEntityName || ""}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm space-y-2">
            <span className="font-medium">Country</span>
            <input
              name="country"
              defaultValue={vendor.country || ""}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm space-y-2">
            <span className="font-medium">License Number</span>
            <input
              name="licenseNumber"
              defaultValue={vendor.licenseNumber || ""}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium">Logo URL</label>
            <input
              name="logoUrl"
              defaultValue={vendor.logoUrl ?? ""}
              placeholder="/logos/pepz.png"
              className="w-full rounded border px-3 py-2"
            />
            <p className="text-xs text-gray-500">Use a public path like /logos/pepz.png</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tagline</label>
            <input
              name="tagline"
              defaultValue={vendor.tagline ?? ""}
              placeholder="Everything Peptides"
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <input
                name="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                defaultValue={vendor.rating ?? ""}
                placeholder="5.0"
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating Count</label>
              <input
                name="ratingCount"
                type="number"
                min="0"
                defaultValue={vendor.ratingCount ?? ""}
                placeholder="500"
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isHouseBrand"
                defaultChecked={vendor.isHouseBrand ?? false}
                className="rounded"
              />
              <span className="text-sm font-medium">Home Brand</span>
            </label>
          </div>

          <label className="block text-sm space-y-2">
            <span className="font-medium">Compliance Accepted</span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="complianceAccepted"
                defaultChecked={vendor.complianceAccepted}
                className="rounded"
              />
              <span className="text-xs text-gray-600">Confirm vendor has accepted compliance terms</span>
            </div>
            {vendor.complianceAcceptedAt && (
              <p className="text-xs text-gray-500">
                Accepted at: {new Date(vendor.complianceAcceptedAt).toLocaleString()}
              </p>
            )}
          </label>

          <div className="text-xs text-gray-500 pt-2">
            Created: {new Date(vendor.createdAt).toLocaleString()} • Products: {vendor._count.products}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Update Vendor
          </button>
        </div>
      </form>

      <form
        action={deleteVendor}
        onSubmit={(e) => {
          if (!confirm(`Delete vendor "${vendor.name}"? This will also delete ${vendor._count.products} associated products.`)) {
            e.preventDefault();
          }
        }}
        className="rounded border border-red-200 bg-red-50 p-6 space-y-3"
      >
        <input type="hidden" name="id" value={vendor.id} />
        <div>
          <div className="font-semibold text-red-900">Danger Zone</div>
          <p className="text-sm text-red-700 mt-1">
            Deleting this vendor will also delete {vendor._count.products} associated product(s).
          </p>
        </div>
        <button
          type="submit"
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete Vendor
        </button>
      </form>
    </div>
  );
}
