import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatPriceAED } from "@/lib/utils/price";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  FULFILLING: "Fulfilling",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

async function updateOrderStatus(formData: FormData) {
  "use server";
  await requireAdmin();

  const orderId = formData.get("orderId") as string;
  const status = formData.get("status") as string;

  if (!orderId || !status) {
    throw new Error("Order ID and status are required");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: params.id },
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
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    redirect("/admin/orders");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Order #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-600">
            Created: {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <Link href="/admin/orders" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to Orders
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded border bg-white p-6 space-y-4">
          <h2 className="font-semibold">Order Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium">{statusLabels[order.status] || order.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatPriceAED(order.totalFils)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery:</span>
              <span>{formatPriceAED(order.deliveryFils)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total:</span>
              <span>{formatPriceAED(order.totalFils)}</span>
            </div>
            {order.stripeCheckoutSessionId && (
              <div className="text-xs text-gray-500 mt-2">
                Stripe Session: {order.stripeCheckoutSessionId}
              </div>
            )}
          </div>

          <form action={updateOrderStatus} className="pt-4 border-t">
            <input type="hidden" name="orderId" value={order.id} />
            <label className="block text-sm font-medium mb-2">Update Status</label>
            <select
              name="status"
              defaultValue={order.status}
              className="w-full rounded border px-3 py-2 text-sm mb-3"
            >
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="PAID">Paid</option>
              <option value="FULFILLING">Fulfilling</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Update Status
            </button>
          </form>
        </div>

        <div className="rounded border bg-white p-6 space-y-4">
          <h2 className="font-semibold">Customer Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Email:</span>
              <p className="font-medium">{order.user?.email || "Guest"}</p>
            </div>
            {order.shippingName && (
              <>
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{order.shippingName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium">{order.shippingPhone}</p>
                </div>
                <div>
                  <span className="text-gray-600">Address:</span>
                  <p className="font-medium">{order.shippingAddressLine1}</p>
                  {order.shippingAddressLine2 && (
                    <p className="font-medium">{order.shippingAddressLine2}</p>
                  )}
                </div>
                {order.shippingNotes && (
                  <div>
                    <span className="text-gray-600">Notes:</span>
                    <p className="font-medium">{order.shippingNotes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-4">Order Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-start text-sm border-b pb-3">
              <div>
                <p className="font-medium">{item.product.name}</p>
                <p className="text-gray-600 text-xs">
                  vendor: {item.vendor.name} • Qty: {item.quantity} • Unit:{" "}
                  {formatPriceAED(item.unitPriceFils)}
                </p>
              </div>
              <p className="font-semibold">{formatPriceAED(item.lineTotalFils)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
