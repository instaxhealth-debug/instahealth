import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ShoppingBag, Package, CheckCircle, Clock, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { VendorOrderStatus } from "@prisma/client";

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
    }),
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
    }),
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Vendor Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {vendor.vendorName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Action
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires acceptance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/vendor/orders?status=READY_FOR_FULFILLMENT">
                <Clock className="mr-2 h-4 w-4" />
                View Pending Orders
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/vendor/orders">
                <ShoppingBag className="mr-2 h-4 w-4" />
                All Orders
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/vendor/settings">
                <Package className="mr-2 h-4 w-4" />
                Vendor Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Accept or reject orders before the deadline (acceptBy)</p>
            <p>• Mark orders as completed when fulfilled</p>
            <p>• Update your settings to manage delivery radius</p>
            <p>• All actions are logged for audit trail</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Orders</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vendor/orders">
              View all orders
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pending Orders</CardTitle>
                <Badge variant="outline">{pendingList.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending orders right now.
                </p>
              ) : (
                pendingList.map((order) => {
                  const acceptByDate = order.acceptBy ? new Date(order.acceptBy) : null;
                  const isExpired = acceptByDate ? acceptByDate < new Date() : false;
                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[order.status]}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            #{shortId(order.id)}
                          </span>
                        </div>
                        <Link
                          href={`/vendor/orders/${order.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{order._count.items} item(s)</span>
                        <span>{formatMoney(order.totalFils)}</span>
                        <span>
                          {formatDistanceToNow(new Date(order.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="text-xs">
                        {acceptByDate ? (
                          isExpired ? (
                            <span className="text-red-600">Expired</span>
                          ) : (
                            <span className="text-amber-600">
                              Expires in {formatDistanceToNow(acceptByDate)}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">No deadline</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Accepted Orders</CardTitle>
                <Badge variant="outline">{acceptedList.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {acceptedList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No accepted or in-progress orders.
                </p>
              ) : (
                acceptedList.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[order.status]}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          #{shortId(order.id)}
                        </span>
                      </div>
                      <Link
                        href={`/vendor/orders/${order.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{order._count.items} item(s)</span>
                      <span>{formatMoney(order.totalFils)}</span>
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
