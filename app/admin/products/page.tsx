import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ProductsControlCenter } from "./ProductsControlCenter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  await requireAdmin();

  const [products, vendors, locations] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { vendor: true, locations: { include: { location: true } } },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  // Calculate metrics
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.active).length;
  const outOfStock = products.filter((p) => !p.inStock).length;
  const totalVendors = vendors.length;

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage products, pricing, and visibility</p>
        </div>
        <Link href="/admin/products/new">
          <Button className="bg-[#41a59b] hover:bg-[#369189] rounded-xl h-11 gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Products Control Center */}
      <ProductsControlCenter
        products={products}
        vendors={vendors}
        locations={locations}
        metrics={{
          totalProducts,
          activeProducts,
          outOfStock,
          totalVendors,
        }}
      />
    </div>
  );
}
