import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function updateLocation(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = (formData.get("id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();

  if (!id || !name) {
    throw new Error("ID and name are required");
  }

  await prisma.location.update({
    where: { id },
    data: { name },
  });

  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

async function deleteLocation(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = (formData.get("id") as string)?.trim();
  if (!id) {
    throw new Error("ID is required");
  }

  await prisma.location.delete({ where: { id } });

  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export default async function EditLocationPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const location = await prisma.location.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (!location) {
    redirect("/admin/locations");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit Location</h1>
          <p className="text-sm text-gray-600">Update location details or delete.</p>
        </div>
        <Link href="/admin/locations" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to Locations
        </Link>
      </div>

      <form action={updateLocation} className="rounded border bg-white p-6 space-y-4">
        <input type="hidden" name="id" value={location.id} />

        <label className="block text-sm space-y-2">
          <span className="font-medium">Name *</span>
          <input
            name="name"
            defaultValue={location.name}
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        <div className="text-xs text-gray-500 pt-2">
          Created: {new Date(location.createdAt).toLocaleString()} • Products assigned: {location._count.products}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Update Location
          </button>
        </div>
      </form>

      <form
        action={deleteLocation}
        onSubmit={(e) => {
          if (!confirm(`Delete location "${location.name}"? This will remove ${location._count.products} product assignments.`)) {
            e.preventDefault();
          }
        }}
        className="rounded border border-red-200 bg-red-50 p-6 space-y-3"
      >
        <input type="hidden" name="id" value={location.id} />
        <div>
          <div className="font-semibold text-red-900">Danger Zone</div>
          <p className="text-sm text-red-700 mt-1">
            Deleting this location will remove it from {location._count.products} product assignment(s).
          </p>
        </div>
        <button
          type="submit"
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete Location
        </button>
      </form>
    </div>
  );
}
