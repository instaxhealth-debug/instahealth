import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatPriceAED } from "@/lib/utils/price";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

async function markPayoutPaid(formData: FormData) {
  "use server";
  await requireAdmin();

  const vendorId = formData.get("vendorId") as string;
  const amountFils = parseInt(formData.get("amountFils") as string);
  const reference = formData.get("reference") as string;
  const paidAt = formData.get("paidAt") as string;
  const periodStart = formData.get("periodStart") as string;
  const periodEnd = formData.get("periodEnd") as string;

  if (!vendorId || !amountFils || !reference || !paidAt) {
    throw new Error("Missing required fields");
  }

  await prisma.vendorPayout.create({
    data: {
      vendorId,
      amountFils,
      status: "PAID",
      reference,
      paidAt: new Date(paidAt),
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    },
  });

  revalidatePath("/admin/payouts");
  redirect("/admin/payouts");
}

export default async function AdminPayoutsPage() {
  await requireAdmin();

  const vendors = await prisma.vendor.findMany({
    where: { status: "active" },
    include: {
      orderItems: {
        where: {
          fulfilled: true,
          order: {
            status: {
              in: ["PAID", "FULFILLED"],
            },
          },
        },
        include: {
          order: {
            select: {
              id: true,
              createdAt: true,
              status: true,
            },
          },
        },
      },
      vendorPayouts: {
        where: {
          status: "PAID",
        },
        select: {
          amountFils: true,
          paidAt: true,
        },
      },
    },
  });

  // Calculate totals for each vendor
  const vendorPayouts = vendors.map((vendor) => {
    const fulfilledItems = vendor.orderItems;
    const totalOwedFils = fulfilledItems.reduce((sum, item) => sum + item.lineTotalFils, 0);
    const totalPaidFils = vendor.vendorPayouts.reduce((sum, p) => sum + p.amountFils, 0);
    const outstandingFils = totalOwedFils - totalPaidFils;

    // Get unique orders
    const orderIds = new Set(fulfilledItems.map((item) => item.orderId));
    const orders = Array.from(orderIds).map((id) =>
      fulfilledItems.find((item) => item.orderId === id)!.order
    );

    return {
      vendor,
      fulfilledItems,
      totalOwedFils,
      totalPaidFils,
      outstandingFils,
      orders,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vendor Payouts</h1>
        <p className="text-sm text-gray-600">Calculate and mark vendor payouts as paid.</p>
      </div>

      <div className="space-y-6">
        {vendorPayouts.map(({ vendor, fulfilledItems, totalOwedFils, totalPaidFils, outstandingFils, orders }) => (
          <div key={vendor.id} className="rounded border bg-white p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{vendor.name}</h2>
                <p className="text-sm text-gray-600">{vendor.email}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Outstanding</div>
                <div className="text-xl font-bold">{formatPriceAED(outstandingFils)}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-4 text-sm">
              <div>
                <div className="text-gray-600">Total Owed</div>
                <div className="font-semibold">{formatPriceAED(totalOwedFils)}</div>
              </div>
              <div>
                <div className="text-gray-600">Total Paid</div>
                <div className="font-semibold">{formatPriceAED(totalPaidFils)}</div>
              </div>
              <div>
                <div className="text-gray-600">Items Fulfilled</div>
                <div className="font-semibold">{fulfilledItems.length}</div>
              </div>
            </div>

            {fulfilledItems.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Contributing Orders ({orders.length})</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id}>
                      Order #{order.id.slice(-8).toUpperCase()} - {new Date(order.createdAt).toLocaleDateString()} -{" "}
                      {order.status}
                    </div>
                  ))}
                  {orders.length > 5 && <div>...and {orders.length - 5} more</div>}
                </div>
              </div>
            )}

            {outstandingFils > 0 && (
              <form action={markPayoutPaid} className="border-t pt-4 mt-4">
                <input type="hidden" name="vendorId" value={vendor.id} />
                <input type="hidden" name="amountFils" value={outstandingFils} />
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Reference *</label>
                    <input
                      type="text"
                      name="reference"
                      required
                      className="w-full rounded border px-3 py-2 text-sm"
                      placeholder="e.g. BANK-REF-12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Paid Date *</label>
                    <input
                      type="date"
                      name="paidAt"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Period Start (optional)</label>
                    <input
                      type="date"
                      name="periodStart"
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Period End (optional)</label>
                    <input
                      type="date"
                      name="periodEnd"
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Mark as Paid ({formatPriceAED(outstandingFils)})
                </button>
              </form>
            )}

            {outstandingFils === 0 && (
              <div className="border-t pt-4 mt-4 text-sm text-gray-600">
                No outstanding balance. All fulfilled items have been paid.
              </div>
            )}
          </div>
        ))}
      </div>

      {vendorPayouts.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          No vendors with fulfilled orders yet.
        </div>
      )}
    </div>
  );
}
