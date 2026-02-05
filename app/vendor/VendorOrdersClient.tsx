"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VendorOrderSummary {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  customer: {
    name?: string;
    phone?: string;
    address?: string;
  };
  amount: {
    aed: string;
  };
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    lineAED: string;
  }>;
}

export default function VendorOrdersClient() {
  const [orders, setOrders] = useState<VendorOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vendor/orders", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load orders");
      }
      setOrders(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (vendorOrderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/vendor/orders/${vendorOrderId}/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  const rejectOrder = async (vendorOrderId: string) => {
    const reason = window.prompt("Reason for rejection?") || "Vendor rejected";
    if (!reason) return;
    try {
      const res = await fetch(`/api/vendor/orders/${vendorOrderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject order");
      }
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || "Failed to reject order");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vendor Orders</h2>
        <Button variant="outline" onClick={fetchOrders} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {isLoading && <div className="text-sm text-gray-500">Loading orders...</div>}

      {orders.length === 0 && !isLoading && (
        <div className="text-sm text-gray-500">No orders yet.</div>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Order #{order.orderId.slice(-6)} • {order.status}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-700">
                <div>{order.customer?.name}</div>
                <div>{order.customer?.phone}</div>
                <div className="text-gray-500">{order.customer?.address}</div>
              </div>
              <div className="text-sm">Total: AED {order.amount.aed}</div>
              <div className="text-sm text-gray-600">
                {order.items.map((item) => (
                  <div key={item.id}>
                    {item.productName} × {item.quantity} — AED {item.lineAED}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {order.status === "READY_FOR_FULFILLMENT" && (
                  <>
                    <Button onClick={() => updateStatus(order.id, "ACCEPTED")}>Accept</Button>
                    <Button variant="outline" onClick={() => rejectOrder(order.id)}>
                      Reject
                    </Button>
                  </>
                )}
                {order.status === "ACCEPTED" && (
                  <Button onClick={() => updateStatus(order.id, "IN_PROGRESS")}>Start</Button>
                )}
                {order.status === "IN_PROGRESS" && (
                  <Button onClick={() => updateStatus(order.id, "COMPLETED")}>Complete</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}