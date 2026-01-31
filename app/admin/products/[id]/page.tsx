import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_SLUGS } from "@/lib/utils/category";
import Link from "next/link";
import { removeProductFromAlgolia, upsertProductToAlgolia } from "@/server/services/algolia";

export const dynamic = 'force-dynamic';

// Canonical category slugs (hard-enforced)
const VALID_CATEGORIES = Object.values(CATEGORY_SLUGS);

async function updateProduct(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = (formData.get("id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const priceAed = (formData.get("priceAed") as string)?.trim();
  const categoryInput = (formData.get("category") as string)?.trim();
  const vendorId = (formData.get("vendorId") as string)?.trim();
  const inStock = formData.get("inStock") === "on";
  const active = formData.get("active") === "on";
  const isGlobal = formData.get("isGlobal") === "on";

  // Hard-enforce required fields
  if (!id || !name || !priceAed || !vendorId || !categoryInput) {
    throw new Error("ID, name, price, vendor, and category are required");
  }

  // Hard-enforce category is one of the 9 valid slugs
  if (!VALID_CATEGORIES.includes(categoryInput as any)) {
    throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  const priceFils = Math.round(Number(priceAed) * 100);
  if (Number.isNaN(priceFils) || priceFils <= 0) {
    throw new Error("Price must be a positive number");
  }

  const locationIds = (formData.getAll("locations") as string[]).filter(Boolean);

  // Hard-enforce availability rules
  if (!isGlobal && locationIds.length === 0) {
    throw new Error("Product must be either Global OR assigned to at least one location");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name,
        vendorId,
        description: description || null,
        priceFils,
        category: categoryInput,
        inStock,
        active,
        isGlobal,
      },
    });

    await tx.productLocation.deleteMany({ where: { productId: id } });

    if (!isGlobal && locationIds.length > 0) {
      await tx.productLocation.createMany({
        data: locationIds.map((locationId) => ({ productId: id, locationId })),
      });
    }
  });

  await upsertProductToAlgolia(id);

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

async function deleteProduct(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = (formData.get("id") as string)?.trim();
  if (!id) {
    throw new Error("ID is required");
  }

  await prisma.product.delete({ where: { id } });

  await removeProductFromAlgolia(id);

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const [product, vendors, locations] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        vendor: true,
        locations: {
          include: { location: true },
        },
      },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) {
    redirect("/admin/products");
  }

  const assignedLocationIds = new Set(product.locations.map((pl) => pl.locationId));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit Product</h1>
          <p className="text-sm text-gray-600">Update product details, assign locations, or delete.</p>
        </div>
        <Link href="/admin/products" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to Products
        </Link>
      </div>

      <form action={updateProduct} className="rounded border bg-white p-6 space-y-4">
        <input type="hidden" name="id" value={product.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm space-y-2">
            <span className="font-medium">Name *</span>
            <input
              name="name"
              defaultValue={product.name}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm space-y-2">
            <span className="font-medium">Price (AED) *</span>
            <input
              name="priceAed"
              type="number"
              step="0.01"
              min="0"
              defaultValue={(product.priceFils / 100).toFixed(2)}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm space-y-2">
            <span className="font-medium">Category</span>
            <select name="category" defaultValue={product.category} className="w-full rounded border px-3 py-2 text-sm">
              <option value="blood-tests">Blood Tests</option>
              <option value="iv-drips">IV Drips</option>
              <option value="supplements">Supplements</option>
              <option value="peptides">Peptides</option>
              <option value="hormones">Hormones</option>
              <option value="consultations">Consultations</option>
              <option value="insurance">Insurance</option>
              <option value="skincare">Skincare</option>
              <option value="haircare">Haircare</option>
            </select>
          </label>

          <label className="block text-sm space-y-2">
            <span className="font-medium">Vendor</span>
            <select
              name="vendorId"
              defaultValue={product.vendorId}
              required
              className="w-full rounded border px-3 py-2 text-sm"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm space-y-2">
          <span className="font-medium">Description</span>
          <textarea
            name="description"
            defaultValue={product.description || ""}
            rows={3}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-3">
          <div className="font-medium text-sm">Availability</div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="inStock" defaultChecked={product.inStock} className="rounded" />
              <span>In Stock</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="active" defaultChecked={product.active} className="rounded" />
              <span>Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isGlobal" defaultChecked={product.isGlobal} className="rounded" />
              <span>Global (all locations)</span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Assign to Locations</div>
            {locations.length === 0 ? (
              <p className="text-sm text-gray-500">No locations available. Create locations first.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {locations.map((location) => (
                  <label key={location.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="locations"
                      value={location.id}
                      defaultChecked={assignedLocationIds.has(location.id)}
                      className="rounded"
                    />
                    <span>{location.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">Required unless Global is checked.</p>
          </div>
        </div>

        <div className="text-xs text-gray-500 pt-2">
          Created: {new Date(product.createdAt).toLocaleString()} • Slug: {product.slug}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Update Product
          </button>
        </div>
      </form>

      <form
        action={deleteProduct}
        onSubmit={(e) => {
          if (!confirm(`Delete product "${product.name}"?`)) {
            e.preventDefault();
          }
        }}
        className="rounded border border-red-200 bg-red-50 p-6 space-y-3"
      >
        <input type="hidden" name="id" value={product.id} />
        <div>
          <div className="font-semibold text-red-900">Danger Zone</div>
          <p className="text-sm text-red-700 mt-1">
            Permanently delete this product. This action cannot be undone.
          </p>
        </div>
        <button
          type="submit"
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete Product
        </button>
      </form>
    </div>
  );
}
