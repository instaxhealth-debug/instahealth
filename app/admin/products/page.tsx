import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { CATEGORY_SLUGS } from "@/lib/utils/category";
import { CreateProductForm } from "./CreateProductForm";
import { upsertProductToAlgolia } from "@/server/services/algolia";

export const dynamic = 'force-dynamic';

// Canonical category slugs (hard-enforced)
const VALID_CATEGORIES = Object.values(CATEGORY_SLUGS);

async function createProduct(formData: FormData) {
  "use server";
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const priceAed = (formData.get("priceAed") as string)?.trim();
  const vendorId = (formData.get("vendorId") as string)?.trim();
  const categoryInput = (formData.get("category") as string)?.trim();
  const active = formData.get("active") === "on";
  const inStock = formData.get("inStock") === "on";
  const isGlobal = formData.get("isGlobal") === "on";
  const locationIds = (formData.getAll("locations") as string[]).filter(Boolean);

  // Hard-enforce required fields
  if (!name || !priceAed || !vendorId || !categoryInput) {
    throw new Error("Name, price, vendor, and category are required");
  }

  // Hard-enforce category is one of the 9 valid slugs
  if (!VALID_CATEGORIES.includes(categoryInput as any)) {
    throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  const priceFils = Math.round(Number(priceAed) * 100);
  if (Number.isNaN(priceFils) || priceFils <= 0) {
    throw new Error("Price must be a positive number");
  }

  // Hard-enforce availability rules
  if (!isGlobal && locationIds.length === 0) {
    throw new Error("Product must be either Global OR assigned to at least one location");
  }

  const baseSlug = generateSlug(name);
  const slug = await generateUniqueSlug(baseSlug, async (candidate) => {
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    return !!existing;
  });

  let createdProductId = "";
  await prisma.$transaction(async (tx: any) => {
    const product = await tx.product.create({
      data: {
        name,
        slug,
        vendorId,
        category: categoryInput,
        priceFils,
        inStock,
        active,
        isGlobal,
      },
    });

    createdProductId = product.id;

    if (!isGlobal && locationIds.length > 0) {
      await tx.productLocation.createMany({
        data: locationIds.map((locationId) => ({
          productId: product.id,
          locationId,
        })),
      });
    }
  });

  if (createdProductId) {
    await upsertProductToAlgolia(createdProductId);
  }

  revalidatePath("/admin/products");
}

export default async function ProductsPage() {
  await requireAdmin();

  const [products, vendors, locations] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { vendor: true, locations: true },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-gray-600">Manage products and pricing.</p>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="font-semibold mb-4">Create Product</div>
        <CreateProductForm
          vendors={vendors}
          locations={locations}
          onSubmit={createProduct}
        />
      </div>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3 font-semibold">All Products</div>
        <div className="divide-y">
          {products.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-600">No products yet.</div>
          ) : (
            products.map((product: any) => {
              const visibilityText = product.isGlobal
                ? "Global"
                : product.locations.length > 0
                  ? product.locations.map((pl: any) => pl.location.name).join(", ")
                  : "⚠ No locations";

              return (
                <div key={product.id} className="px-4 py-3 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{product.name}</div>
                    <div className="text-gray-600 text-xs">
                      Vendor: {product.vendor?.name || "-"} • AED {(product.priceFils / 100).toFixed(2)} • {product.category}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      Status: {product.active ? "Active" : "Inactive"} • Stock: {product.inStock ? "Yes" : "No"} • Visible in: {visibilityText}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">{new Date(product.createdAt).toLocaleDateString()}</div>
                    <a
                      href={`/admin/products/${product.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
