import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_SLUGS } from "@/lib/utils/category";
import Link from "next/link";
import { FixVisibilityButton } from "./FixVisibilityButton";

export const dynamic = 'force-dynamic';

type CategoryKey = keyof typeof CATEGORY_SLUGS;

async function getHealthData() {
  const [activeLocations, activeVendors, allProducts] = await Promise.all([
    prisma.location.count({ where: { isActive: true } }),
    prisma.vendor.count({ where: { status: "active" } }),
    prisma.product.findMany({
      include: { vendor: true, locations: true },
    }),
  ]);

  // Count active+inStock products per category
  const productsByCategory: Record<string, number> = {};
  const categoryKeys = Object.values(CATEGORY_SLUGS);

  for (const catSlug of categoryKeys) {
    productsByCategory[catSlug] = allProducts.filter(
      (p) => p.active && p.inStock && p.category === catSlug
    ).length;
  }

  // Find warnings
  const warnings: string[] = [];

  // Check for vendors with no active+inStock products
  const vendorsWithProducts = await prisma.vendor.findMany({
    where: { status: "active" },
    include: {
      products: {
        where: { active: true, inStock: true },
      },
    },
  });

  const vendorsWithoutProducts = vendorsWithProducts.filter((v) => v.products.length === 0);
  if (vendorsWithoutProducts.length > 0) {
    warnings.push(
      `${vendorsWithoutProducts.length} active vendor(s) have no active+inStock products: ${vendorsWithoutProducts.map((v) => v.name).join(", ")}`
    );
  }

  // Check for products without location assignment and not global
  const productsWithoutLocation = allProducts.filter(
    (p) => !p.isGlobal && p.locations.length === 0 && p.active && p.inStock
  );
  if (productsWithoutLocation.length > 0) {
    warnings.push(
      `${productsWithoutLocation.length} active+inStock product(s) are not global and have no location assignment: ${productsWithoutLocation.map((p) => p.name).join(", ")}`
    );
  }

  // Check for products with invalid categories
  const invalidCategories = allProducts.filter((p) => !categoryKeys.includes(p.category as any));
  if (invalidCategories.length > 0) {
    warnings.push(
      `${invalidCategories.length} product(s) have invalid category: ${invalidCategories.map((p) => `${p.name} (${p.category})`).join(", ")}`
    );
  }

  return {
    activeLocations,
    activeVendors,
    totalProducts: allProducts.length,
    activeProducts: allProducts.filter((p) => p.active && p.inStock).length,
    productsByCategory,
    warnings,
    productsWithoutLocation,
    vendorsWithoutProducts,
  };
}

export default async function HealthPage() {
  await requireAdmin();
  const health = await getHealthData();

  const allGood = health.warnings.length === 0;
  const categoryKeys = Object.values(CATEGORY_SLUGS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data Health</h1>
          <p className="text-sm text-gray-600">Overview of marketplace data integrity.</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
          ← Dashboard
        </Link>
      </div>

      {/* Status Summary */}
      <div
        className={`rounded border p-4 ${
          allGood ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}
      >
        <div className="font-semibold text-lg mb-2">
          {allGood ? "✓ All systems operational" : "⚠ Issues detected"}
        </div>
        <div className="text-sm space-y-1">
          <p>
            <span className="font-medium">{health.activeLocations}</span> active location
            {health.activeLocations !== 1 ? "s" : ""}
          </p>
          <p>
            <span className="font-medium">{health.activeVendors}</span> active vendor
            {health.activeVendors !== 1 ? "s" : ""}
          </p>
          <p>
            <span className="font-medium">{health.activeProducts}</span> active+inStock product
            {health.activeProducts !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {health.warnings.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="font-semibold text-red-900">Warnings ({health.warnings.length})</div>
          <div className="space-y-2 text-sm text-red-800">
            {health.warnings.map((warning, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-red-600 font-bold">!</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products per Category */}
      <div className="rounded border bg-white p-4">
        <div className="font-semibold mb-3">Active+InStock Products by Category</div>
        <div className="grid sm:grid-cols-3 gap-3">
          {categoryKeys.map((slug) => (
            <div key={slug} className="rounded border p-3 text-sm">
              <div className="text-gray-600 capitalize">{slug.replace(/-/g, " ")}</div>
              <div className="text-2xl font-bold mt-1">{health.productsByCategory[slug] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Products without location assignment */}
      {health.productsWithoutLocation.length > 0 && (
        <div className="rounded border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-orange-900">
              Products missing location assignment ({health.productsWithoutLocation.length})
            </div>
            <FixVisibilityButton />
          </div>
          <div className="space-y-2 text-sm">
            {health.productsWithoutLocation.map((product) => (
              <div key={product.id} className="flex items-center justify-between">
                <span className="text-orange-900">
                  {product.name} ({product.category}) — {product.vendor?.name || "Unknown vendor"}
                </span>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="text-orange-700 hover:text-orange-900 font-medium text-xs"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendors without products */}
      {health.vendorsWithoutProducts.length > 0 && (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-4">
          <div className="font-semibold mb-3 text-yellow-900">
            Active vendors with no products ({health.vendorsWithoutProducts.length})
          </div>
          <div className="space-y-2 text-sm">
            {health.vendorsWithoutProducts.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between">
                <span className="text-yellow-900">{vendor.name}</span>
                <Link
                  href={`/admin/vendors/${vendor.id}/edit`}
                  className="text-yellow-700 hover:text-yellow-900 font-medium text-xs"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
