import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShoppingBag, Package, CheckCircle, Clock } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function VendorDashboard() {
  const vendor = await getVendorContext();

  // Fetch quick stats
  const [totalOrders, pendingOrders, completedOrders, todayOrders] = await Promise.all([
    prisma.vendorOrder.count({
      where: { vendorId: vendor.vendorId },
    }),
    prisma.vendorOrder.count({
      where: {
        vendorId: vendor.vendorId,
        status: { in: ["READY_FOR_FULFILLMENT", "NEW"] },
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
  ]);

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
    </div>
  );
}
