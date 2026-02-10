import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [vendorCount, productCount, locationCount, userCount, orderStats] = await Promise.all([
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.location.count(),
    prisma.user.count(),
    prisma.order.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const orderCounts = orderStats.reduce((acc, stat) => {
    acc[stat.status] = stat._count;
    return acc;
  }, {} as Record<string, number>);

  const cards = [
    { label: "Vendors", value: vendorCount, href: "/admin/vendors" },
    { label: "Products", value: productCount, href: "/admin/products" },
    { label: "Orders", value: orderStats.reduce((sum, s) => sum + s._count, 0), href: "/admin/orders" },
    { label: "Pending Payment", value: orderCounts.PENDING_PAYMENT || 0, href: "/admin/orders" },
    { label: "Paid Orders", value: orderCounts.PAID || 0, href: "/admin/orders" },
    { label: "Locations", value: locationCount, href: "/admin/locations" },
    { label: "Users", value: userCount, href: "/admin/users" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">Overview of your marketplace data.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/vendors"
          className="rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Manage Vendors
        </Link>
        <Link
          href="/admin/products"
          className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
        >
          Manage Products
        </Link>
        <Link
          href="/admin/vendor-applications"
          className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
        >
          Vendor Applications
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href || "#"}
            className="rounded border bg-white p-4 hover:bg-gray-50 transition-colors block"
          >
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className="text-2xl font-bold">{card.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
