import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/cards/ProductCard";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPriceAED } from "@/lib/utils/price";
import type { StorefrontProduct } from "@/lib/api/products";

export const revalidate = 0;

interface VendorPeptidesPageProps {
  params: {
    vendorSlug: string;
  };
}

export default async function VendorPeptidesPage({ params }: VendorPeptidesPageProps) {
  noStore();

  const vendor = await prisma.vendor.findUnique({
    where: {
      slug: params.vendorSlug,
    },
    include: {
      products: {
        where: {
          active: true,
          inStock: true,
          category: "Peptides",
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
      },
    },
  });

  if (!vendor || vendor.status !== "active") {
    notFound();
  }

  // Transform products to StorefrontProduct format
  const storefrontProducts: StorefrontProduct[] = vendor.products.map((product) => ({
    id: product.id,
    type: "product" as const,
    vertical: "pepz" as const,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    image: product.imageUrl || "",
    categoryId: "peptides",
    price: product.priceFils / 100,
    priceFils: product.priceFils,
    priceDisplay: formatPriceAED(product.priceFils),
    currency: "AED" as const,
    isActive: product.active,
    vendorId: vendor.id,
    vendorName: vendor.name,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }));

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back button */}
      <div className="mb-4">
        <Button variant="ghost" asChild className="rounded-full">
          <Link href="/marketplace/peptides">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Peptide Shops
          </Link>
        </Button>
      </div>

      {/* Vendor Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{vendor.name}</h1>
        <p className="text-muted-foreground">
          {vendor.products.length} {vendor.products.length === 1 ? 'product' : 'products'} available
        </p>
      </div>

      {/* Products Grid */}
      {storefrontProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products available from this vendor.</p>
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
