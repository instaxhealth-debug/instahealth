import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/cards/ProductCard";
import { WhatsAppCTAButton } from "@/components/shop/WhatsAppCTAButton";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft, X, Search } from "lucide-react";
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
  searchParams?: {
    q?: string;
  };
}

export default async function VendorShopPage({ params, searchParams }: VendorShopPageProps) {
  noStore();

  const categorySlug = params.category;
  const canonicalCategory = categoryMap[categorySlug];
  const searchQuery = (searchParams?.q || "").trim();

  if (!canonicalCategory) {
    notFound();
  }

  const categoryTitle = categoryTitles[categorySlug] || "Products";

  // Get vendor
  const vendor = await prisma.vendor.findUnique({
    where: { slug: params.vendorSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      tagline: true,
      logoUrl: true,
    },
  });

  if (!vendor || vendor.status !== "active") {
    notFound();
  }

  const normalizeLogoUrl = (logoUrl: string | null) => {
    if (!logoUrl) return null;
    let normalized = logoUrl.trim();

    if (normalized.includes("/public/")) {
      normalized = normalized.replace(/^.*\/public/, "");
    }

    if (!normalized.startsWith("/")) {
      normalized = `/${normalized}`;
    }

    return normalized;
  };

  const resolvedLogoUrl = normalizeLogoUrl(vendor.logoUrl);

  const selectedLocationId = await getSelectedLocationId();
  const selectedLocation = await getSelectedLocation();
  const session = await auth();

  // DEV DEBUG: Count products at each filter stage
  const totalProductsForVendor = await prisma.product.count({
    where: { vendorId: vendor.id },
  });

  const activeInStockForVendor = await prisma.product.count({
    where: {
      vendorId: vendor.id,
      active: true,
      inStock: true,
    },
  });

  const activeInStockCategoryForVendor = await prisma.product.count({
    where: {
      vendorId: vendor.id,
      active: true,
      inStock: true,
      category: canonicalCategory,
    },
  });

  // Build search conditions (vendor-scoped, category-scoped)
  const searchConditions = searchQuery
    ? {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" as const } },
          { sku: { contains: searchQuery, mode: "insensitive" as const } },
          { tags: { hasSome: [searchQuery] } },
          { description: { contains: searchQuery, mode: "insensitive" as const } },
        ],
      }
    : {};

  // Query products with location visibility rules
  // Product is visible if:
  // - vendorId matches
  // - category matches
  // - active=true AND inStock=true
  // - isGlobal=true OR ProductLocation exists for selectedLocationId
  // - search conditions (if query provided)
  const products = await prisma.product.findMany({
    where: {
      vendorId: vendor.id,
      active: true,
      inStock: true,
      deletedAt: null, // ✅ Exclude soft-deleted products
      category: canonicalCategory,
      ...searchConditions,
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
          <a href={`/marketplace/${categorySlug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {categoryTitle}
          </a>
        </Button>
      </div>

      {/* Vendor Header with Logo */}
      <div className="mb-6">
        {resolvedLogoUrl ? (
          <div className="mb-4">
            <div className="relative h-24 w-auto max-w-xs">
              <Image
                src={resolvedLogoUrl}
                alt={`${vendor.name} logo`}
                fill
                className="object-contain object-left"
                sizes="(max-width: 768px) 200px, 300px"
                priority
              />
            </div>
          </div>
        ) : (
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{vendor.name}</h1>
        )}
        {vendor.tagline && (
          <p className="text-muted-foreground mb-3">{vendor.tagline}</p>
        )}

        {/* Product Count */}
        <p className="text-muted-foreground mb-2">
          {searchQuery && storefrontProducts.length === 0
            ? `No products found for "${searchQuery}"`
            : storefrontProducts.length > 0
            ? `${storefrontProducts.length} ${storefrontProducts.length === 1 ? 'product' : 'products'} ${searchQuery ? `matching "${searchQuery}"` : `available in ${selectedLocation?.name || "your location"}`}`
            : "Products coming soon"}
        </p>

        {/* Search Bar */}
        <form method="get" className="flex gap-2 mb-6 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder={`Search ${vendor.name} ${categoryTitle.toLowerCase()}...`}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-10 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                asChild
              >
                <a href={`/shop/${params.vendorSlug}/${categorySlug}`}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </a>
              </Button>
            )}
          </div>
          <Button type="submit" size="default" className="px-6">
            Search
          </Button>
        </form>
      </div>

      {/* Products Grid / Special Content */}
      {/* MyDoctorHealthcare special WhatsApp CTA */}
      {vendor.slug === "mydoctorhealthcare" ? (
        <WhatsAppCTAButton />
      ) : storefrontProducts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center space-y-3">
          <div className="text-4xl">{searchQuery ? "🔍" : "🛍️"}</div>
          <div className="text-lg font-semibold text-slate-900">
            {searchQuery
              ? `No products found for "${searchQuery}"`
              : "Products coming soon"}
          </div>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No ${categoryTitle.toLowerCase()} from ${vendor.name} match your search. Try a different search term or browse all products.`
              : `${vendor.name} is preparing their ${categoryTitle.toLowerCase()} catalog. Check back soon!`}
          </p>

          {/* Actions */}
          <div className="pt-4 flex gap-2 justify-center">
            {searchQuery && (
              <Button asChild variant="default">
                <a href={`/shop/${params.vendorSlug}/${categorySlug}`}>
                  Clear Search
                </a>
              </Button>
            )}
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
