import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ShoppingBag, Package, CheckCircle, Clock, ArrowUpRight, Plus, Settings, List } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ShopifyConnection } from "@/components/vendor/ShopifyConnection";
type VendorOrderStatus =
  | "NEW"
  | "READY_FOR_FULFILLMENT"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "FAILED";

type PendingOrderRow = {
  id: string;
  status: VendorOrderStatus;
  totalFils: number;
  createdAt: Date;
  acceptBy: Date | null;
  _count: { items: number };
};

type AcceptedOrderRow = {
  id: string;
  status: VendorOrderStatus;
  totalFils: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { items: number };
};

export const dynamic = 'force-dynamic';

export default async function VendorDashboard() {
  const vendor = await getVendorContext();

  const pendingStatuses: VendorOrderStatus[] = ["NEW", "READY_FOR_FULFILLMENT"];
  const acceptedStatuses: VendorOrderStatus[] = ["ACCEPTED", "IN_PROGRESS"];

  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    todayOrders,
    pendingList,
    acceptedList,
    vendorData,
    productCounts,
  ] = await Promise.all([
    prisma.vendorOrder.count({
      where: { vendorId: vendor.vendorId },
    }),
    prisma.vendorOrder.count({
      where: {
        vendorId: vendor.vendorId,
        status: { in: pendingStatuses },
      },
    }),
    prisma.vendorOrder.count({
      where: {
        vendorId: vendor.vendorId,
        status: "COMPLETED",
      },
    }),
    prisma.vendorOrder.count({
      where: {
        vendorId: vendor.vendorId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.vendorOrder.findMany({
      where: {
        vendorId: vendor.vendorId,
        status: { in: pendingStatuses },
      },
      select: {
        id: true,
        status: true,
        totalFils: true,
        createdAt: true,
        acceptBy: true,
        _count: { select: { items: true } },
      },
      orderBy: [{ acceptBy: "asc" }, { createdAt: "asc" }],
      take: 20,
    }) as Promise<PendingOrderRow[]>,
    prisma.vendorOrder.findMany({
      where: {
        vendorId: vendor.vendorId,
        status: { in: acceptedStatuses },
      },
      select: {
        id: true,
        status: true,
        totalFils: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
    }) as Promise<AcceptedOrderRow[]>,
    prisma.vendor.findUnique({
      where: { id: vendor.vendorId },
      select: {
        id: true,
        shopifyConnected: true,
        shopifyShopDomain: true,
        shopifyLastSyncAt: true,
        shopifySyncStatus: true,
      },
    }),
    Promise.all([
      prisma.product.count({
        where: { vendorId: vendor.vendorId },
      }),
      prisma.product.count({
        where: { vendorId: vendor.vendorId, source: "shopify" },
      }),
    ]).then(([total, shopify]) => ({ total, shopify })),
  ]);

  const STATUS_COLORS: Record<VendorOrderStatus, string> = {
    NEW: "bg-blue-500",
    READY_FOR_FULFILLMENT: "bg-yellow-500",
    ACCEPTED: "bg-green-500",
    IN_PROGRESS: "bg-purple-500",
    COMPLETED: "bg-green-700",
    REJECTED: "bg-red-500",
    CANCELLED: "bg-gray-500",
    FAILED: "bg-red-700",
  };

  const formatMoney = (fils: number) => `AED ${(fils / 100).toFixed(2)}`;
  const shortId = (id: string) => id.slice(-8).toUpperCase();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, <span className="font-semibold text-gray-900">{vendor.vendorName}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-[#41a59b]/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-[#41a59b]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalOrders}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Action
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{pendingOrders}</div>
            <p className="text-xs text-orange-600 mt-1 font-medium">
              Requires acceptance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{completedOrders}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{todayOrders}</div>
            <p className="text-xs text-gray-500 mt-1">New orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Shopify Integration */}
      {vendorData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <ShopifyConnection vendor={vendorData} productCount={productCounts} />
        </div>
      )}

      {/* Quick Actions + Important Notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full h-11 justify-start bg-[#41a59b] hover:bg-[#369189] text-white rounded-xl shadow-sm">
              <Link href="/vendor/products/new">
                <Plus className="mr-2 h-5 w-5" />
                Add New Product
              </Link>
            </Button>
            <Link href="/vendor/products">
              <div className="w-full h-11 flex items-center px-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
                <Package className="mr-3 h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Manage Products</span>
              </div>
            </Link>
            <Link href="/vendor/orders">
              <div className="w-full h-11 flex items-center px-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
                <List className="mr-3 h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">View All Orders</span>
              </div>
            </Link>
            <Link href="/vendor/settings">
              <div className="w-full h-11 flex items-center px-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
                <Settings className="mr-3 h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Vendor Settings</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-[#41a59b] mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Accept or reject orders before deadline</p>
                <p className="text-xs text-gray-500 mt-0.5">Check the acceptBy timestamp on each order</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-[#41a59b] mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Mark orders as completed when fulfilled</p>
                <p className="text-xs text-gray-500 mt-0.5">This triggers customer notifications and payment release</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-[#41a59b] mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Manage delivery radius in settings</p>
                <p className="text-xs text-gray-500 mt-0.5">Update your service areas and delivery zones</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-[#41a59b] mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">All actions are logged for audit</p>
                <p className="text-xs text-gray-500 mt-0.5">Complete transaction history is maintained</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <Button variant="outline" size="sm" asChild className="rounded-xl">
            <Link href="/vendor/orders">
              View all orders
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Orders */}
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Pending Orders</CardTitle>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 font-semibold">{pendingList.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingList.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">
                    No pending orders right now
                  </p>
                </div>
              ) : (
                pendingList.map((order: PendingOrderRow) => {
                  const acceptByDate = order.acceptBy ? new Date(order.acceptBy) : null;
                  const isExpired = acceptByDate ? acceptByDate < new Date() : false;
                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all bg-gray-50/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${STATUS_COLORS[order.status]} text-white font-semibold text-xs`}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-gray-500 font-medium">
                            #{shortId(order.id)}
                          </span>
                        </div>
                        <Link
                          href={`/vendor/orders/${order.id}`}
                          className="text-sm font-semibold text-[#41a59b] hover:text-[#369189]"
                        >
                          Open →
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium">{order._count.items} item(s)</span>
                        <span className="font-semibold text-gray-900">{formatMoney(order.totalFils)}</span>
                        <span>
                          {formatDistanceToNow(new Date(order.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="text-xs font-medium">
                        {acceptByDate ? (
                          isExpired ? (
                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded">⚠ Expired</span>
                          ) : (
                            <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              ⏱ Expires in {formatDistanceToNow(acceptByDate)}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-500">No deadline</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Accepted Orders */}
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Accepted Orders</CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-700 font-semibold">{acceptedList.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {acceptedList.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">
                    No accepted or in-progress orders
                  </p>
                </div>
              ) : (
                acceptedList.map((order: AcceptedOrderRow) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all bg-gray-50/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${STATUS_COLORS[order.status]} text-white font-semibold text-xs`}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-gray-500 font-medium">
                          #{shortId(order.id)}
                        </span>
                      </div>
                      <Link
                        href={`/vendor/orders/${order.id}`}
                        className="text-sm font-semibold text-[#41a59b] hover:text-[#369189]"
                      >
                        Open →
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium">{order._count.items} item(s)</span>
                      <span className="font-semibold text-gray-900">{formatMoney(order.totalFils)}</span>
                      <span>
                        {formatDistanceToNow(new Date(order.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
