import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductForm } from "./ProductForm";
import { formatPriceAED } from "@/lib/utils/price";

export const dynamic = 'force-dynamic';

async function getVendor(id: string) {
  return await prisma.vendor.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { products: true },
      },
    },
  });
}

export default async function VendorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const vendor = await getVendor(params.id);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin/vendors"
          className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block"
        >
          ← Back to Vendors
        </Link>
        <h1 className="text-3xl font-bold mb-2">{vendor.name}</h1>
        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              vendor.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {vendor.status}
          </span>
          <span className="text-gray-500">
            {vendor._count.products} product{vendor._count.products !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.products.length === 0 ? (
                <p className="text-gray-500">
                  No products yet. Create your first product for this vendor below.
                </p>
              ) : (
                <div className="space-y-4">
                  {vendor.products.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 border rounded-lg flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Category: {product.category}</span>
                          <span>{formatPriceAED(product.priceFils)}</span>
                          <span
                            className={`px-2 py-0.5 rounded ${
                              product.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {product.inStock ? "In Stock" : "Out of Stock"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded ${
                              product.active ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {product.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Create Product</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductForm vendorId={vendor.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
