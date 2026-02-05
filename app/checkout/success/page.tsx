import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const session = await auth();
  const orderId = searchParams.orderId;

  if (!orderId || !session?.user?.email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-semibold mb-2">Payment received</p>
            <p className="text-sm text-gray-600">Order details are available in your account.</p>
            <Link href="/orders" className="text-primary hover:underline text-sm block mt-4">
              View my orders
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      user: { email: session.user.email },
    },
    include: {
      items: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600">Order Confirmed</p>
            <h1 className="text-2xl font-bold">Thank you for your purchase</h1>
          </div>

          {order ? (
            <div className="space-y-2 text-sm text-gray-700">
              <div>
                <span className="font-medium">Order ID:</span> {order.id}
              </div>
              <div>
                <span className="font-medium">Total:</span> AED {(order.totalFils / 100).toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Shipping:</span> {order.shippingAddressLine1}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Order details not found.</p>
          )}

          <div className="flex gap-3">
            <Link href="/orders" className="text-primary hover:underline text-sm">
              View my orders
            </Link>
            <Link href="/marketplace" className="text-primary hover:underline text-sm">
              Continue shopping
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
