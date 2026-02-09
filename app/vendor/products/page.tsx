import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getVendorContext } from "@/lib/vendor-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { isServiceCategory } from "@/lib/vendor-categories";
type ProductRow = {
  id: string;
  name: string;
  category: string;
  updatedAt: Date;
  active: boolean;
  published: boolean;
  inventoryStatus: string;
  inStock: boolean;
  priceFils: number;
  calendlyUrl: string | null;
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { q?: string };
}

const INVENTORY_BADGES: Record<string, string> = {
  in_stock: "bg-green-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

export default async function VendorProductsPage({ searchParams }: PageProps) {
  const vendor = await getVendorContext();
  const query = (searchParams?.q || "").trim();

  const products: ProductRow[] = await prisma.product.findMany({
    where: {
      vendorId: vendor.vendorId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      category: true,
      updatedAt: true,
      active: true,
      published: true,
      inventoryStatus: true,
      inStock: true,
      priceFils: true,
      calendlyUrl: true,
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
        <Button asChild>
          <Link href="/vendor/products/new">Add item</Link>
        </Button>
      </div>

      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name or category"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.length === 0 ? (
            <div className="text-sm text-muted-foreground">No items found.</div>
          ) : (
            products.map((product) => {
              const isService = isServiceCategory(product.category);
              return (
                <div
                  key={product.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{product.name}</span>
                        <Badge variant="outline">{product.category}</Badge>
                        <Badge variant="outline">{isService ? "Service" : "Product"}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(product.updatedAt), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/vendor/products/${product.id}`}>Manage</Link>
                      </Button>
                    </div>
                  </div>

                  {isService ? (
                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Active</span>
                        <div className="font-medium">{product.active ? "Yes" : "No"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Calendly</span>
                        <div className="font-medium">
                          {product.calendlyUrl ? "Connected" : "Not connected"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price</span>
                        <div className="font-medium">AED {(product.priceFils / 100).toFixed(2)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <span className="text-muted-foreground">Published</span>
                        <div className="font-medium">{product.published ? "Yes" : "No"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Active</span>
                        <div className="font-medium">{product.active ? "Yes" : "No"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Inventory</span>
                        <div className="flex items-center gap-2">
                          <Badge className={INVENTORY_BADGES[product.inventoryStatus] || "bg-gray-500"}>
                            {product.inventoryStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">In stock</span>
                        <div className="font-medium">{product.inStock ? "Yes" : "No"}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price</span>
                        <div className="font-medium">AED {(product.priceFils / 100).toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
