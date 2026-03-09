import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getVendorContext } from "@/lib/vendor-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductImportModal } from "./ProductImportModal";
import { ImagePlus, X } from "lucide-react";
import { ProductsListClient } from "./ProductsListClient";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  tags: string[];
  updatedAt: Date;
  active: boolean;
  published: boolean;
  inventoryStatus: string;
  inStock: boolean;
  priceFils: number;
  bookingUrl: string | null;
  imageUrl: string | null;
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { q?: string };
}

export default async function VendorProductsPage({ searchParams }: PageProps) {
  const vendor = await getVendorContext();
  const query = (searchParams?.q || "").trim();

  // Build search conditions
  const searchConditions = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { sku: { contains: query, mode: "insensitive" as const } },
          { category: { contains: query, mode: "insensitive" as const } },
          { tags: { hasSome: [query] } }, // Exact match in tags array
        ],
      }
    : {};

  const products: ProductRow[] = await prisma.product.findMany({
    where: {
      vendorId: vendor.vendorId,
      ...searchConditions,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      tags: true,
      updatedAt: true,
      active: true,
      published: true,
      inventoryStatus: true,
      inStock: true,
      priceFils: true,
      bookingUrl: true,
      imageUrl: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Products & Services</h1>
          <p className="text-muted-foreground">Manage your catalog and availability</p>
        </div>
        <div className="flex gap-2">
          <ProductImportModal />
          <Button variant="outline" asChild>
            <Link href="/vendor/products/images">
              <ImagePlus className="h-4 w-4 mr-2" />
              Bulk Images
            </Link>
          </Button>
          <Button asChild>
            <Link href="/vendor/products/new">Add item</Link>
          </Button>
        </div>
      </div>

      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by name, SKU, category, or tags..."
            className="w-full rounded border px-3 py-2 pr-10 text-sm"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              asChild
            >
              <Link href="/vendor/products">
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Link>
            </Button>
          )}
        </div>
        <Button type="submit" size="sm" className="sm:w-auto w-full">
          Search
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductsListClient products={products} query={query} />
        </CardContent>
      </Card>
    </div>
  );
}
