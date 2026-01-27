"use client";

import { CartView } from "@/components/cart/CartView";
import { ComplianceDisclaimer } from "@/components/compliance/Disclaimer";

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      <div className="mb-6">
        <ComplianceDisclaimer />
      </div>
      <CartView />
    </div>
  );
}

