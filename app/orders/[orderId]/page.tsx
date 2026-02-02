import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceAED } from "@/lib/utils/price";
import { ArrowLeft, Phone, MapPin, Clock, Package } from "lucide-react";
import Link from "next/link";

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

const statusSteps = {
  PENDING_PAYMENT: 1,
  PAID: 2,
  FULFILLING: 3,
  FULFILLED: 4,
  CANCELLED: -1,
  REFUNDED: -1,
};

interface OrderDetailPageProps {
  params: {
    orderId: string;
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: params.orderId,
      userId: user.id,
    },
    include: {
      items: {
        include: {
          vendor: true,
        },
      },
    },
  });

  if (!order) {
    redirect("/orders");
  }

  const currentStep = statusSteps[order.status as keyof typeof statusSteps] || 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/orders" className="flex items-center gap-2 text-primary hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <h1 className="text-3xl font-bold mb-2">Order #{order.id.slice(-8).toUpperCase()}</h1>
        <p className="text-gray-600">{new Date(order.createdAt).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order Status</CardTitle>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusColors[order.status] || statusColors.PENDING_PAYMENT
                  }`}
                >
                  {statusLabels[order.status] || order.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {/* Timeline */}
              <div className="space-y-4">
                {[
                  { step: 1, label: "Order Placed", status: "Confirmed" },
                  { step: 2, label: "Payment Processed", status: "Processing" },
                  { step: 3, label: "Being Prepared", status: "In Progress" },
                  { step: 4, label: "Ready for Delivery", status: "Pending" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          currentStep >= item.step
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {currentStep > item.step ? "✓" : item.step}
                      </div>
                      {item.step < 4 && (
                        <div
                          className={`w-1 h-8 my-2 ${
                            currentStep > item.step ? "bg-green-200" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-600">{item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-600">{item.vendorName}</p>
                      <p className="text-xs text-gray-500 mt-1">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatPriceAED(item.lineTotalFils)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPriceAED(item.unitPriceFils)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information Card */}
          {order.shippingAddressLine1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{order.shippingName}</p>
                  <p className="text-sm text-gray-700">{order.shippingAddressLine1}</p>
                  {order.shippingAddressLine2 && (
                    <p className="text-sm text-gray-700">{order.shippingAddressLine2}</p>
                  )}
                  <div className="flex items-center gap-2 pt-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    {order.shippingPhone}
                  </div>
                  {order.shippingNotes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600 font-medium">Delivery Notes</p>
                      <p className="text-sm text-gray-700">{order.shippingNotes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPriceAED(order.subtotalFils)}</span>
              </div>
              {order.deliveryFils > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">{formatPriceAED(order.deliveryFils)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-primary">{formatPriceAED(order.totalFils)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/support" className="block">
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </Link>
              <Link href="/orders" className="block">
                <Button variant="outline" className="w-full">
                  View All Orders
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Order ID</p>
                  <p className="font-mono text-xs text-gray-900 break-all">{order.id}</p>
                </div>
                {order.stripeCheckoutSessionId && (
                  <div>
                    <p className="text-gray-600">Payment ID</p>
                    <p className="font-mono text-xs text-gray-900 break-all">
                      {order.stripeCheckoutSessionId.slice(-16)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
