import { CategoryIconRow } from "@/components/marketplace/CategoryIconRow";
import { VendorShopCard } from "@/components/marketplace/VendorShopCard";
import { prisma } from "@/lib/prisma";
import { getSelectedLocationId } from "@/lib/location";
import { auth } from "@/lib/auth";
import { isServiceCategory } from "@/lib/vendor-categories";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

export const revalidate = 0;

// Map URL slugs to database category values
// Map URL slugs to canonical DB category slugs (exact match only)
const categoryMap: Record<string, string> = {
  "blood-tests": "blood-tests",
  "iv-drips": "iv-drips",
  clinics: "clinics",
  "supplements": "supplements",
  "peptides": "peptides",
  "hormones": "hormones",
  "consultations": "consultations",
  "insurance": "insurance",
  "skincare": "skincare",
  "haircare": "haircare",
};

const categoryConfig: Record<
  string,
  {
    title: string;
    tabs: Array<{ id: string; label: string }>;
  }
> = {
  "blood-tests": {
    title: "Blood Tests",
    tabs: [
      { id: "all", label: "All" },
      { id: "general", label: "General Health" },
      { id: "performance", label: "Performance" },
      { id: "hormones", label: "Hormones" },
      { id: "men", label: "Men's Health" },
      { id: "women", label: "Women's Health" },
    ],
  },
  "iv-drips": {
    title: "IV Drips",
    tabs: [
      { id: "all", label: "All" },
      { id: "hydration", label: "Hydration" },
      { id: "energy", label: "Energy" },
      { id: "recovery", label: "Recovery" },
      { id: "beauty", label: "Beauty" },
      { id: "immunity", label: "Immunity" },
    ],
  },
  clinics: {
    title: "Clinics",
    tabs: [
      { id: "all", label: "All" },
      { id: "general", label: "General" },
      { id: "specialist", label: "Specialist" },
    ],
  },
  "supplements": {
    title: "Supplements",
    tabs: [
      { id: "all", label: "All" },
      { id: "vitamins", label: "Vitamins" },
      { id: "minerals", label: "Minerals" },
      { id: "protein", label: "Protein" },
      { id: "wellness", label: "Wellness" },
    ],
  },
  peptides: {
    title: "Peptide Products",
    tabs: [
      { id: "all", label: "All" },
      { id: "oral", label: "Oral peptides" },
      { id: "injectables", label: "Injectables" },
      { id: "fat-loss", label: "Fat loss" },
      { id: "recovery", label: "Recovery" },
      { id: "longevity", label: "Longevity" },
    ],
  },
  hormones: {
    title: "Hormones",
    tabs: [
      { id: "all", label: "All" },
      { id: "trt", label: "TRT" },
      { id: "hrt", label: "HRT" },
      { id: "thyroid", label: "Thyroid" },
    ],
  },
  consultations: {
    title: "Consultations",
    tabs: [
      { id: "all", label: "All" },
      { id: "general", label: "General" },
      { id: "specialist", label: "Specialist" },
    ],
  },
  insurance: {
    title: "Insurance",
    tabs: [
      { id: "all", label: "All" },
      { id: "individual", label: "Individual" },
      { id: "family", label: "Family" },
    ],
  },
  skincare: {
    title: "Skincare",
    tabs: [
      { id: "all", label: "All" },
      { id: "anti-aging", label: "Anti-Aging" },
      { id: "acne", label: "Acne Treatment" },
    ],
  },
  haircare: {
    title: "Haircare",
    tabs: [
      { id: "all", label: "All" },
      { id: "growth", label: "Hair Growth" },
      { id: "restoration", label: "Restoration" },
    ],
  },
};

export default async function MarketplaceCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  noStore();

  const categorySlug = params.category;
  const config = categoryConfig[categorySlug];
  const canonicalCategory = categoryMap[categorySlug];
  const isService = canonicalCategory ? isServiceCategory(canonicalCategory) : false;

  if (!config || !canonicalCategory) {
    notFound();
  }

  const selectedLocationId = await getSelectedLocationId();
  const session = await auth();
  const showDebug = process.env.NODE_ENV !== "production" && session?.user?.role === "ADMIN";

  // DEBUG: Log query params
  console.log(`[${categorySlug}] selectedLocationId`, selectedLocationId);

  // DEBUG: Count total products in this category (no filters)
  const totalProductsInCategory = await prisma.product.count({
    where: { category: canonicalCategory },
  });
  console.log(`[${categorySlug}] totalProductsInCategory:`, totalProductsInCategory);

  // DEBUG: Count active+inStock products in this category
  const activeProductsInCategory = await prisma.product.count({
    where: {
      category: canonicalCategory,
      active: true,
      published: true,
      ...(isService ? {} : { inStock: true }),
    },
  });
  console.log(`[${categorySlug}] activeProductsInCategory:`, activeProductsInCategory);

  // DEBUG: Count global products
  const globalProducts = await prisma.product.count({
    where: {
      category: canonicalCategory,
      active: true,
      published: true,
      ...(isService ? {} : { inStock: true }),
      isGlobal: true,
    },
  });
  console.log(`[${categorySlug}] globalProducts:`, globalProducts);

  // Fetch vendors with products in this category
  const vendors = await prisma.vendor.findMany({
    where: {
      status: "active",
      products: {
        some: {
          active: true,
          published: true,
          ...(isService ? {} : { inStock: true }),
          category: canonicalCategory,
          OR: [
            { isGlobal: true },
            ...(selectedLocationId
              ? [{ locations: { some: { locationId: selectedLocationId } } }]
              : []),
          ],
        },
      },
    },
    orderBy: [
      { isHouseBrand: "desc" },
      { rating: "desc" },
      { ratingCount: "desc" },
      { name: "asc" },
    ],
    include: {
      products: {
        where: {
          active: true,
          published: true,
          ...(isService ? {} : { inStock: true }),
          category: canonicalCategory,
          OR: [
            { isGlobal: true },
            ...(selectedLocationId
              ? [{ locations: { some: { locationId: selectedLocationId } } }]
              : []),
          ],
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  console.log(`[${categorySlug}] vendors found:`, vendors.length);
  
  // DEBUG: Log vendor details for logo resolution
  vendors.forEach((v) => {
    console.log(`  [vendor] name="${v.name}" slug="${v.slug}" logoUrl="${v.logoUrl}"`);
  });

  // Build vendor shop data
  const vendorShops = vendors.map((vendor) => {
    const products = vendor.products;
    let minPrice = Infinity;

    for (const product of products) {
      minPrice = Math.min(minPrice, product.priceFils);
    }

    return {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      logoUrl: vendor.logoUrl || null,
      tagline: vendor.tagline || null,
      rating: vendor.rating || null,
      ratingCount: vendor.ratingCount || null,
      isHouseBrand: vendor.isHouseBrand || false,
      productCount: products.length,
      minPriceFils: minPrice === Infinity ? 0 : minPrice,
    };
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Category Icon Row */}
      <CategoryIconRow />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{config.title}</h1>
        </div>

        {vendorShops.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center space-y-4">
            <div className="text-lg font-semibold text-amber-900">
              No {config.title} vendors available in your location
            </div>
            <p className="text-sm text-amber-800 max-w-md mx-auto">
              This category requires: active vendors with in-stock products assigned to your location (or marked as global).
            </p>

            {showDebug && (
              <div className="mt-6 rounded border border-amber-300 bg-white p-4 text-left text-xs space-y-2">
                <div className="font-semibold text-amber-900">📋 Debug Info (Admin Only)</div>
                <div className="text-amber-800 space-y-1">
                  <div>Category: {canonicalCategory}</div>
                  <div>Selected Location ID: {selectedLocationId || "❌ NULL - products without isGlobal=true won't show!"}</div>
                  <div>Vendors found: {vendors.length}</div>
                  <div className="pt-2 text-xs">
                    <div className="font-semibold">Possible issues:</div>
                    <ul className="list-disc ml-4 mt-1">
                      <li>Products exist but isGlobal=false AND no ProductLocation rows</li>
                      <li>Vendors are status=&quot;inactive&quot;</li>
                      <li>Products are active=false or inStock=false</li>
                      <li>Check <Link href="/admin/health" className="underline text-blue-600">Admin Health Dashboard</Link></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {vendorShops.map((shop) => (
              <VendorShopCard
                key={shop.id}
                vendor={{
                  id: shop.id,
                  name: shop.name,
                  slug: shop.slug,
                  logoUrl: shop.logoUrl,
                  tagline: shop.tagline,
                  rating: shop.rating,
                  ratingCount: shop.ratingCount,
                  isHouseBrand: shop.isHouseBrand,
                }}
                category={categorySlug}
                productCount={shop.productCount}
                minPriceFils={shop.minPriceFils}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
