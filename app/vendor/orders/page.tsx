import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Clock, Package, AlertCircle } from "lucide-react";
import { VendorOrderStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

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

export default async function VendorOrders({ searchParams }: PageProps) {
  const vendor = await getVendorContext();

  // Parse filters from URL
  const statusFilter = searchParams.status as VendorOrderStatus | undefined;

  // Build query
  const where: any = {
    vendorId: vendor.vendorId,
  };

  if (statusFilter) {
    where.status = statusFilter;
  }

  // Fetch orders with strict vendor scoping
  const vendorOrders = await prisma.vendorOrder.findMany({
    where,
    include: {
      order: {
        select: {
          id: true,
          shippingName: true,
          shippingPhone: true,
          createdAt: true,
        },
      },
      items: {
        include: {
          orderItem: {
            select: {
              productName: true,
              quantity: true,
              lineTotalFils: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100, // Limit for performance
  });

  const statusCounts = await prisma.vendorOrder.groupBy({
    by: ["status"],
    where: { vendorId: vendor.vendorId },
    _count: true,
  });

  const countsByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count])
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orders</h1>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={!statusFilter ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/vendor/orders">All Orders</Link>
        </Button>
        <Button
          variant={
            statusFilter === "READY_FOR_FULFILLMENT" ? "default" : "outline"
          }
          size="sm"
          asChild
        >
          <Link href="/vendor/orders?status=READY_FOR_FULFILLMENT">
            Pending ({countsByStatus["READY_FOR_FULFILLMENT"] || 0})
          </Link>
        </Button>
        <Button
          variant={statusFilter === "ACCEPTED" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/vendor/orders?status=ACCEPTED">
            Accepted ({countsByStatus["ACCEPTED"] || 0})
          </Link>
        </Button>
        <Button
          variant={statusFilter === "IN_PROGRESS" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/vendor/orders?status=IN_PROGRESS">
            In Progress ({countsByStatus["IN_PROGRESS"] || 0})
          </Link>
        </Button>
        <Button
          variant={statusFilter === "COMPLETED" ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/vendor/orders?status=COMPLETED">
            Completed ({countsByStatus["COMPLETED"] || 0})
          </Link>
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {vendorOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
            </CardContent>
          </Card>
        ) : (
          vendorOrders.map((vendorOrder) => {
            const itemCount = vendorOrder.items.length;
            const totalFils = vendorOrder.totalFils;
            const isUrgent =
              (vendorOrder.status === "READY_FOR_FULFILLMENT" ||
                vendorOrder.status === "NEW") &&
              new Date(vendorOrder.acceptBy) < new Date();

            return (
              <Link
                key={vendorOrder.id}
                href={`/vendor/orders/${vendorOrder.id}`}
              >
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={STATUS_COLORS[vendorOrder.status]}>
                            {vendorOrder.status.replace(/_/g, " ")}
                          </Badge>
                          {isUrgent && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              OVERDUE
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {vendorOrder.order.shippingName || "No name"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {vendorOrder.order.shippingPhone || "No phone"}
                          </p>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{itemCount} item(s)</span>
                          <span>AED {(totalFils / 100).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-sm text-right space-y-1">
                        <div className="text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(
                            new Date(vendorOrder.createdAt),
                            { addSuffix: true }
                          )}
                        </div>
                        {(vendorOrder.status === "READY_FOR_FULFILLMENT" ||
                          vendorOrder.status === "NEW") && (
                          <div className="text-xs">
                            Accept by:{" "}
                            {new Date(vendorOrder.acceptBy).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
