import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/cards/ProductCard";
import { WhatsAppCTAButton } from "@/components/shop/WhatsAppCTAButton";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPriceAED } from "@/lib/utils/price";
import { getSelectedLocationId, getSelectedLocation } from "@/lib/location";
import { auth } from "@/lib/auth";
import type { StorefrontProduct } from "@/lib/api/products";

export const revalidate = 0;

// Map URL slugs to database category values (exact match)
const categoryMap: Record<string, string> = {
  "blood-tests": "blood-tests",
  "iv-drips": "iv-drips",
  "supplements": "supplements",
  "peptides": "peptides",
  "hormones": "hormones",
  "consultations": "consultations",
  "insurance": "insurance",
  "skincare": "skincare",
  "haircare": "haircare",
};

const categoryTitles: Record<string, string> = {
  "blood-tests": "Blood Tests",
  "iv-drips": "IV Drips",
  "supplements": "Supplements",
  "peptides": "Peptides",
  "hormones": "Hormones",
  "consultations": "Consultations",
  "insurance": "Insurance",
  "skincare": "Skincare",
  "haircare": "Haircare",
};

interface VendorShopPageProps {
  params: {
    vendorSlug: string;
    category: string;
  };
}

export default async function VendorShopPage({ params }: VendorShopPageProps) {
  noStore();

  const categorySlug = params.category;
  const canonicalCategory = categoryMap[categorySlug];

  if (!canonicalCategory) {
    notFound();
  }

  const categoryTitle = categoryTitles[categorySlug] || "Products";

  // Get vendor
  const vendor = await prisma.vendor.findUnique({
    where: { slug: params.vendorSlug },
  });

  if (!vendor || vendor.status !== "active") {
    notFound();
  }

  const selectedLocationId = await getSelectedLocationId();
  const selectedLocation = await getSelectedLocation();
  const session = await auth();

  // DEV DEBUG: Count products at each filter stage
  console.log(`[VENDOR SHOP] vendorSlug=${params.vendorSlug}, category=${categorySlug}`);
  console.log(`[VENDOR SHOP] selectedLocationId=${selectedLocationId}`);

  const totalProductsForVendor = await prisma.product.count({
    where: { vendorId: vendor.id },
  });
  console.log(`[VENDOR SHOP] totalProductsForVendor (no filters):`, totalProductsForVendor);

  const activeInStockForVendor = await prisma.product.count({
    where: {
      vendorId: vendor.id,
      active: true,
      inStock: true,
    },
  });
  console.log(`[VENDOR SHOP] activeInStockForVendor:`, activeInStockForVendor);

  const activeInStockCategoryForVendor = await prisma.product.count({
    where: {
      vendorId: vendor.id,
      active: true,
      inStock: true,
      category: canonicalCategory,
    },
  });
  console.log(`[VENDOR SHOP] activeInStockCategoryForVendor (${canonicalCategory}):`, activeInStockCategoryForVendor);

  // Query products with location visibility rules
  // Product is visible if:
  // - vendorId matches
  // - category matches
  // - active=true AND inStock=true
  // - isGlobal=true OR ProductLocation exists for selectedLocationId
  const products = await prisma.product.findMany({
    where: {
      vendorId: vendor.id,
      active: true,
      inStock: true,
      category: canonicalCategory,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(`[VENDOR SHOP] products after location filter:`, products.length);

  // Transform products to StorefrontProduct format
  const storefrontProducts: StorefrontProduct[] = products.map((product) => {
    // Special handling for InstaBloodz inquiry pricing
    const isInquiryOnly = vendor.slug === "instabloodz" && product.priceFils === 0;
    
    return {
      id: product.id,
      type: "product" as const,
      vertical: "pepz" as const, // Generic vertical, can be enhanced later
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      image: product.imageUrl || "",
      categoryId: categorySlug,
      price: product.priceFils / 100,
      priceFils: product.priceFils,
      priceDisplay: isInquiryOnly ? "Inquire" : formatPriceAED(product.priceFils),
      currency: "AED" as const,
      isActive: product.active,
      vendorId: vendor.id,
      vendorName: vendor.name,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  });

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back button */}
      <div className="mb-4">
        <Button variant="ghost" asChild className="rounded-full">
          <Link href={`/marketplace/${categorySlug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {categoryTitle}
          </Link>
        </Button>
      </div>

      {/* Vendor Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{vendor.name}</h1>
        {vendor.tagline && (
          <p className="text-muted-foreground mb-2">{vendor.tagline}</p>
        )}
        <p className="text-muted-foreground">
          {storefrontProducts.length} {storefrontProducts.length === 1 ? 'product' : 'products'} available in {selectedLocation?.name || "your location"}
        </p>
      </div>

      {/* Products Grid / Special Content */}
      {/* MyDoctorHealthcare special WhatsApp CTA */}
      {vendor.slug === "mydoctorhealthcare" ? (
        <WhatsAppCTAButton />
      ) : storefrontProducts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center space-y-4">
          <div className="text-lg font-semibold text-slate-900">
            No {categoryTitle} available from {vendor.name}
          </div>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            This vendor doesn&apos;t have any products in this category for {selectedLocation?.name || "your location"}.
          </p>

          {/* Admin-only diagnostics */}
          {session?.user?.role === "ADMIN" && (
            <div className="mt-6 rounded border border-amber-300 bg-white p-4 text-left text-xs space-y-2">
              <div className="font-semibold text-amber-900">📋 Debug Info (Admin Only)</div>
              <div className="text-amber-800 space-y-1">
                <div>Vendor: {vendor.name} (slug: {params.vendorSlug})</div>
                <div>Category: {canonicalCategory} (slug: {categorySlug})</div>
                <div>Selected Location: {selectedLocation?.name || "NULL"} (ID: {selectedLocationId || "❌ NULL"})</div>
                <div>Total products for vendor: {totalProductsForVendor}</div>
                <div>Active+InStock for vendor: {activeInStockForVendor}</div>
                <div>Active+InStock+Category for vendor: {activeInStockCategoryForVendor}</div>
                <div>After location filter: {products.length}</div>
                <div className="pt-2">
                  <div className="font-semibold">Possible issues:</div>
                  <ul className="list-disc ml-4 mt-1">
                    <li>Products exist but isGlobal=false AND no ProductLocation rows for this location</li>
                    <li>Products are in wrong category (check product.category field)</li>
                    <li>Products are active=false or inStock=false</li>
                    <li>Check <Link href="/admin/health" className="underline text-blue-600">Admin Health Dashboard</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Back to category */}
          <div className="pt-4">
            <Button asChild variant="outline">
              <Link href={`/marketplace/${categorySlug}`}>
                Browse Other {categoryTitle} Vendors
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {storefrontProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
