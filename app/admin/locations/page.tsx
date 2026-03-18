import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils/slug";

export const dynamic = 'force-dynamic';

async function createLocation(formData: FormData) {
  "use server";
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    throw new Error("Name is required");
  }

  const slug = generateSlug(name);

  await prisma.location.upsert({
    where: { name },
    update: {},
    create: {
      id: crypto.randomUUID(),
      name,
      slug,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/locations");
}

export default async function LocationsPage() {
  await requireAdmin();

  const locations = await prisma.location.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Locations</h1>
        <p className="text-sm text-gray-600">Manage service locations.</p>
      </div>

      <form action={createLocation} className="rounded border bg-white p-4 space-y-3">
        <div className="font-semibold">Create Location</div>
        <label className="text-sm space-y-1">
          <span className="block">Name *</span>
          <input name="name" required className="w-full rounded border px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm font-semibold text-white">
          Create
        </button>
      </form>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3 font-semibold">All Locations</div>
        <div className="divide-y">
          {locations.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-600">No locations yet.</div>
          ) : (
            locations.map((location) => (
              <div key={location.id} className="px-4 py-3 text-sm flex items-center justify-between">
                <div className="font-semibold">{location.name}</div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">{new Date(location.createdAt).toLocaleDateString()}</div>
                  <a
                    href={`/admin/locations/${location.id}`}
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
