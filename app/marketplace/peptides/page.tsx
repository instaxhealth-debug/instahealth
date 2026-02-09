import { ShopDirectoryFilters } from "@/components/marketplace/ShopDirectoryFilters";
import { VendorShopCard } from "@/components/marketplace/VendorShopCard";
import { CategoryIconRow } from "@/components/marketplace/CategoryIconRow";
import { prisma } from "@/lib/prisma";
import { getSelectedLocationId } from "@/lib/location";
import { auth } from "@/lib/auth";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import type { Session } from "next-auth";

export const revalidate = 0;

async function AdminDebugPanel({
  selectedLocationId,
  session,
}: {
  selectedLocationId: string | null;
  session: Session | null;
}) {
  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center space-y-4">
        <div className="text-lg font-semibold text-amber-900">No peptide vendors available</div>
        <p className="text-sm text-amber-800 max-w-md mx-auto">
          This category requires active vendors with in-stock products assigned to your location (or marked as global).
        </p>
        <Link href="/categories" className="text-sm text-amber-700 hover:text-amber-900 font-medium underline">
          Browse other categories
        </Link>
      </div>
    );
  }

  // Fetch debug data
  let debugData = null;
  let debugError = null;
  try {
    const res = await fetch("http://localhost:3000/api/debug/catalog", {
      cache: "no-store",
    });
    if (res.ok) {
      debugData = await res.json();
    } else {
      debugError = "Failed to fetch debug data";
    }
  } catch (err) {
    debugError = String(err);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center space-y-4">
        <div className="text-lg font-semibold text-amber-900">No peptide vendors available in your location</div>
        <p className="text-sm text-amber-800 max-w-md mx-auto">
          This category requires: active vendors with in-stock products assigned to your location (or marked as global).
        </p>
        <div className="pt-2">
          <Link href="/categories" className="text-sm text-amber-700 hover:text-amber-900 font-medium underline">
            Browse other categories
          </Link>
        </div>
      </div>

      <div className="rounded border border-red-300 bg-red-50 p-6 space-y-3">
        <div className="font-semibold text-red-900">🔍 Debug Dashboard (Admin Only)</div>

        {debugError ? (
          <div className="text-sm text-red-700">Error loading debug data: {debugError}</div>
        ) : debugData ? (
          <div className="space-y-3 text-sm">
            <div className="bg-white rounded p-3 space-y-2 font-mono text-xs">
              <div>
                <span className="text-gray-600">selectedLocationId:</span>{" "}
                <span className="font-bold text-red-700">{debugData.selectedLocationId}</span>
              </div>
              <div>
                <span className="text-gray-600">activeLocationsCount:</span>{" "}
                <span className="font-bold">{debugData.activeLocationsCount}</span>
              </div>
              <div>
                <span className="text-gray-600">activeVendorsCount:</span>{" "}
                <span className="font-bold">{debugData.activeVendorsCount}</span>
              </div>
              <div>
                <span className="text-gray-600">totalProductsCount:</span>{" "}
                <span className="font-bold">{debugData.totalProductsCount}</span>
              </div>
              <div>
                <span className="text-gray-600">peptidesProductsMatchingFiltersCount:</span>{" "}
                <span className={`font-bold ${debugData.peptidesProductsMatchingFiltersCount > 0 ? "text-green-700" : "text-red-700"}`}>
                  {debugData.peptidesProductsMatchingFiltersCount}
                </span>
              </div>
              <div>
                <span className="text-gray-600">peptidesVendorsMatchingFiltersCount:</span>{" "}
                <span className={`font-bold ${debugData.peptidesVendorsMatchingFiltersCount > 0 ? "text-green-700" : "text-red-700"}`}>
                  {debugData.peptidesVendorsMatchingFiltersCount}
                </span>
              </div>
            </div>

            <div className="bg-white rounded p-3 space-y-1">
              <div className="font-semibold text-gray-900 mb-2">Visibility Rules Checklist:</div>
              <div className="space-y-1 text-xs text-gray-700">
                <div>✓ product.category = &quot;peptides&quot;</div>
                <div>✓ product.active = true</div>
                <div>✓ product.inStock = true</div>
                <div>✓ vendor.status = &quot;active&quot;</div>
                <div>
                  ✓ product.isGlobal = true <strong>OR</strong> product has ProductLocation row for{" "}
                  <span className="font-mono">{debugData.selectedLocationId}</span>
                </div>
              </div>
            </div>

            {debugData.peptidesVendorsMatchingFiltersCount === 0 && (
              <div className="bg-red-100 rounded p-3 text-xs text-red-800 space-y-1">
                <div className="font-semibold">Why no vendors?</div>
                <div>1. No vendor has a peptides product with active=true AND inStock=true?</div>
                <div>2. Products exist but aren&apos;t assigned to location: {debugData.selectedLocationId}?</div>
                <div>3. Products not marked as global AND no ProductLocation rows?</div>
                <Link href="/admin/health" className="text-blue-700 hover:underline font-medium block mt-2">
                  → Check /admin/health for data issues
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-700">Loading debug data...</div>
        )}
      </div>
    </div>
  );
}

interface VendorShopData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  tagline: string | null;
  rating: number | null;
  ratingCount: number | null;
  isHouseBrand: boolean;
  productCount: number;
  minPriceFils: number;
  sampleImages: (string | null)[];
}

const tabs = [
  { id: "all", label: "All" },
  { id: "oral", label: "Oral peptides" },
  { id: "injectables", label: "Injectables" },
  { id: "fat-loss", label: "Fat loss" },
  { id: "recovery", label: "Recovery" },
  { id: "longevity", label: "Longevity" },
];

export default async function PeptidesMarketplacePage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  noStore();

  const selectedLocationId = await getSelectedLocationId();
  const session = await auth();

  // Find all active vendors with active, in-stock peptide products
  // Products are shown if:
  // 1) isGlobal = true (explicitly marked as available everywhere)
  // 2) ProductLocation row matches selected location
  const vendors = await prisma.vendor.findMany({
    where: {
      status: "active",
      products: {
        some: {
          active: true,
          published: true,
          inStock: true,
          category: "peptides",
          OR: [
            { isGlobal: true },
            ...(selectedLocationId
              ? [{ locations: { some: { locationId: selectedLocationId } } }]
              : []),
          ],
        },
      },
    },
    include: {
      products: {
        where: {
          active: true,
          published: true,
          inStock: true,
          category: "peptides",
          OR: [
            { isGlobal: true },
            ...(selectedLocationId
              ? [{ locations: { some: { locationId: selectedLocationId } } }]
              : []),
          ],
        },
        include: {
          variants: {
            where: {
              active: true,
              inStock: true,
            },
          },
        },
      },
    },
  });

  console.log("[peptides] selectedLocationId", selectedLocationId, "vendors", vendors.length);

  // Transform to shop data with min price calculation
  const vendorShops: VendorShopData[] = vendors.map((vendor) => {
    const products = vendor.products;

    // Calculate minimum price across products and variants
    let minPrice = Infinity;
    const sampleImages: (string | null)[] = [];

    for (const product of products) {
      // Collect sample images
      if (product.imageUrl && sampleImages.length < 2) {
        sampleImages.push(product.imageUrl);
      }

      // Get min price considering variants
      if (product.variants.length > 0) {
        const variantPrices = product.variants.map((v) => v.priceFils);
        minPrice = Math.min(minPrice, ...variantPrices);
      } else {
        minPrice = Math.min(minPrice, product.priceFils);
      }
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
      sampleImages,
    };
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Category Icon Row */}
      <CategoryIconRow />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Peptide Shops</h1>
        </div>

        {vendorShops.length === 0 ? (
          <AdminDebugPanel selectedLocationId={selectedLocationId} session={session} />
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
                category="peptides"
                productCount={shop.productCount}
                minPriceFils={shop.minPriceFils}
                sampleImages={shop.sampleImages}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
