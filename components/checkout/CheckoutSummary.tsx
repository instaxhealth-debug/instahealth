"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceAED } from "@/lib/utils/price";
import { Package, Truck, DollarSign } from "lucide-react";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface CheckoutSummaryProps {
  items: OrderItem[];
  subtotal: number;
  deliveryFee?: number;
  tax?: number;
  discount?: number;
  total: number;
  isLoading?: boolean;
}

export function CheckoutSummary({
  items,
  subtotal,
  deliveryFee = 0,
  tax = 0,
  discount = 0,
  total,
  isLoading = false,
}: CheckoutSummaryProps) {
  return (
    <Card className="sticky top-4 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items List */}
        <div className="max-h-64 overflow-y-auto space-y-2 border-b pb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium line-clamp-1">{item.productName}</p>
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium whitespace-nowrap ml-2">
                {formatPriceAED(item.lineTotal)}
              </p>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3 text-sm">
          {/* Subtotal */}
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatPriceAED(subtotal)}</span>
          </div>

          {/* Delivery Fee */}
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Delivery
              </span>
              <span className="font-medium">{formatPriceAED(deliveryFee)}</span>
            </div>
          )}

          {/* Tax */}
          {tax > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (5%)</span>
              <span className="font-medium">{formatPriceAED(tax)}</span>
            </div>
          )}

          {/* Discount */}
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span className="font-medium">-{formatPriceAED(discount)}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="border-t pt-3 flex justify-between">
          <span className="text-base font-bold">Total</span>
          <span className="text-base font-bold text-primary">
            {formatPriceAED(total)}
          </span>
        </div>

        {/* Secure Payment Badge */}
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-gray-500 border-t">
          <DollarSign className="h-3 w-3" />
          <span>Secure Payment Powered by Stripe</span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
