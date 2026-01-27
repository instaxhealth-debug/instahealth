import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatPriceAED } from "@/lib/utils/price";
import Link from "next/link";

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  FULFILLING: "Fulfilling",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  FULFILLING: "bg-purple-100 text-purple-800",
  FULFILLED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  REFUNDED: "bg-red-100 text-red-800",
};

export default async function AdminOrdersPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      items: {
        include: {
          vendor: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to recent orders
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
    paid: orders.filter((o) => o.status === "PAID").length,
    fulfilled: orders.filter((o) => o.status === "FULFILLED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-gray-600">Manage customer orders and fulfillment.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">Pending Payment</div>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">Paid</div>
          <div className="text-2xl font-bold">{stats.paid}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-500">Fulfilled</div>
          <div className="text-2xl font-bold">{stats.fulfilled}</div>
        </div>
      </div>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3 font-semibold">All Orders</div>
        <div className="divide-y">
          {orders.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-600">No orders yet.</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {order.user?.email || "Guest"} • {new Date(order.createdAt).toLocaleString()}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""} •{" "}
                      {formatPriceAED(order.totalFils)}
                    </div>
                    {order.shippingName && (
                      <div className="text-gray-600 text-xs mt-1">
                        Ship to: {order.shippingName} • {order.shippingPhone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        statusColors[order.status] || statusColors.PENDING_PAYMENT
                      }`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
