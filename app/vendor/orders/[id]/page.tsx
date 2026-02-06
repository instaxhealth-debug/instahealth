import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle, XCircle, Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VendorOrderActions } from "./actions-client";

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500",
  READY_FOR_FULFILLMENT: "bg-yellow-500",
  ACCEPTED: "bg-green-500",
  IN_PROGRESS: "bg-purple-500",
  COMPLETED: "bg-green-700",
  REJECTED: "bg-red-500",
  CANCELLED: "bg-gray-500",
  FAILED: "bg-red-700",
};

export default async function VendorOrderDetail({
  params,
}: {
  params: { id: string };
}) {
  const vendor = await getVendorContext();
  const vendorOrderId = params.id;

  // Fetch vendor order with strict scoping
  const vendorOrder = await prisma.vendorOrder.findUnique({
    where: {
      id: vendorOrderId,
    },
    include: {
      order: {
        select: {
          id: true,
          shippingName: true,
          shippingPhone: true,
          shippingAddressLine1: true,
          shippingAddressLine2: true,
          shippingArea: true,
          shippingEmirate: true,
          shippingNotes: true,
          createdAt: true,
        },
      },
      items: {
        include: {
          orderItem: {
            select: {
              productName: true,
              variantStrength: true,
              variantUnitSize: true,
              quantity: true,
              unitPriceFils: true,
              lineTotalFils: true,
            },
          },
        },
      },
    },
  });

  // Security check: Order must exist and belong to this vendor
  if (!vendorOrder || vendorOrder.vendorId !== vendor.vendorId) {
    console.log("[VENDOR_ORDER_DETAIL] Access denied", {
      vendorOrderId,
      found: !!vendorOrder,
      vendorIdMatch: vendorOrder?.vendorId === vendor.vendorId,
      requestingVendor: vendor.vendorId,
      orderVendor: vendorOrder?.vendorId,
    });
    notFound();
  }

  const isOverdue =
    (vendorOrder.status === "READY_FOR_FULFILLMENT" ||
      vendorOrder.status === "NEW") &&
    new Date(vendorOrder.acceptBy) < new Date();

  const canAccept =
    (vendorOrder.status === "READY_FOR_FULFILLMENT" ||
      vendorOrder.status === "NEW") &&
    new Date(vendorOrder.acceptBy) > new Date();

  const canReject =
    (vendorOrder.status === "READY_FOR_FULFILLMENT" ||
      vendorOrder.status === "NEW") &&
    new Date(vendorOrder.acceptBy) > new Date();

  const canStart = vendorOrder.status === "ACCEPTED";

  const canComplete = vendorOrder.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/vendor/orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Order Details</h1>
          <p className="text-sm text-muted-foreground">
            Order ID: {vendorOrder.orderId.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={STATUS_COLORS[vendorOrder.status]}>
              {vendorOrder.status.replace(/_/g, " ")}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                OVERDUE
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created: </span>
              {formatDistanceToNow(new Date(vendorOrder.createdAt), {
                addSuffix: true,
              })}
            </div>
            {(vendorOrder.status === "READY_FOR_FULFILLMENT" ||
              vendorOrder.status === "NEW") && (
              <div>
                <span className="text-muted-foreground">Accept By: </span>
                {new Date(vendorOrder.acceptBy).toLocaleString()}
              </div>
            )}
            {vendorOrder.acceptedAt && (
              <div>
                <span className="text-muted-foreground">Accepted: </span>
                {new Date(vendorOrder.acceptedAt).toLocaleString()}
              </div>
            )}
            {vendorOrder.rejectedAt && (
              <div>
                <span className="text-muted-foreground">Rejected: </span>
                {new Date(vendorOrder.rejectedAt).toLocaleString()}
              </div>
            )}
            {vendorOrder.fulfilledAt && (
              <div>
                <span className="text-muted-foreground">Fulfilled: </span>
                {new Date(vendorOrder.fulfilledAt).toLocaleString()}
              </div>
            )}
          </div>

          {vendorOrder.terminalReason && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm font-medium text-destructive">
                Reason: {vendorOrder.terminalReason}
              </p>
            </div>
          )}

          {vendorOrder.resolutionNotes && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Notes: </span>
                {vendorOrder.resolutionNotes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Shipping Info */}
      <Card>
        <CardHeader>
          <CardTitle>Customer & Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="font-semibold">
              {vendorOrder.order.shippingName || "No name"}
            </p>
            <p className="text-sm text-muted-foreground">
              {vendorOrder.order.shippingPhone || "No phone"}
            </p>
          </div>
          <div className="text-sm">
            <p>{vendorOrder.order.shippingAddressLine1}</p>
            {vendorOrder.order.shippingAddressLine2 && (
              <p>{vendorOrder.order.shippingAddressLine2}</p>
            )}
            {vendorOrder.order.shippingArea && (
              <p>{vendorOrder.order.shippingArea}</p>
            )}
            {vendorOrder.order.shippingEmirate && (
              <p>{vendorOrder.order.shippingEmirate}</p>
            )}
          </div>
          {vendorOrder.order.shippingNotes && (
            <div className="p-3 bg-muted rounded-lg mt-2">
              <p className="text-sm">
                <span className="font-medium">Delivery Notes: </span>
                {vendorOrder.order.shippingNotes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vendorOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <p className="font-medium">{item.orderItem.productName}</p>
                  {item.orderItem.variantStrength && (
                    <p className="text-sm text-muted-foreground">
                      {item.orderItem.variantStrength}
                      {item.orderItem.variantUnitSize &&
                        ` - ${item.orderItem.variantUnitSize}`}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.orderItem.quantity} × AED{" "}
                    {(item.orderItem.unitPriceFils / 100).toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold">
                  AED {(item.orderItem.lineTotalFils / 100).toFixed(2)}
                </p>
              </div>
            ))}
            <div className="flex justify-between pt-4 border-t font-bold text-lg">
              <span>Total</span>
              <span>AED {(vendorOrder.totalFils / 100).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <VendorOrderActions
        vendorOrderId={vendorOrder.id}
        status={vendorOrder.status}
        canAccept={canAccept}
        canReject={canReject}
        canStart={canStart}
        canComplete={canComplete}
      />
    </div>
  );
}
