import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceAED } from "@/lib/utils/price";

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

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?next=/orders");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          vendor: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-gray-600">View your order history</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-gray-600">No orders yet</p>
            <p className="text-sm text-gray-500 mt-2">
              When you place an order, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusColors[order.status] || statusColors.PENDING_PAYMENT
                    }`}
                  >
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-gray-500 text-xs">
                          {item.vendorName} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">{formatPriceAED(item.lineTotalFils)}</p>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatPriceAED(order.totalFils)}</span>
                    </div>
                  </div>
                  {order.shippingName && (
                    <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                      <p className="font-medium mb-1">Shipping to:</p>
                      <p>{order.shippingName}</p>
                      <p>{order.shippingAddressLine1}</p>
                      {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
                      <p>{order.shippingPhone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
