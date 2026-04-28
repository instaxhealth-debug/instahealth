"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEnhancedCart } from "@/hooks/use-enhanced-cart";
import { buildShippingPayload } from "@/lib/checkout/buildShippingPayload";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComplianceDisclaimer } from "@/components/compliance/Disclaimer";
import { CheckoutProgress } from "@/components/checkout/CheckoutProgress";
import { CheckoutForm, CheckoutFormData } from "@/components/checkout/CheckoutForm";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { AddressModal } from "@/components/account/AddressModal";
import Link from "next/link";

export default function CheckoutPage() {

  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { items, getTotalPrice, getTotalItems, isLoading: cartIsLoading, isHydrated } = useEnhancedCart();

  const [addresses, setAddresses] = useState<Array<{
    id: string;
    label: string;
    formattedAddress: string;
    line1?: string;
    line2?: string;
    area?: string;
    city?: string;
    emirate?: string;
    isDefault?: boolean;
    [key: string]: any;
  }>>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [modalForceOpen, setModalForceOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?next=/checkout");
    }
  }, [sessionStatus, router]);

  // Redirect if cart is empty (FIXED: Wait for cart to actually load)
  useEffect(() => {
    // CRITICAL FIX: Wait for cart to be hydrated before checking if empty
    // isHydrated: For auth users, true when dbCart loaded OR not loading
    // This prevents redirect during the brief window when dbCart === null
    if (items.length === 0 && sessionStatus !== "loading" && isHydrated) {
      router.push("/cart");
    }
  }, [items.length, sessionStatus, isHydrated, router]);

  // REMOVED: Location redirect check
  // Address will be required via AddressModal gating instead

  // Load saved addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (sessionStatus !== "authenticated") return;
      
      setAddressesLoading(true);
      setAddressesError("");
      
      try {
        const response = await fetch("/api/my-account/addresses", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load addresses");
        }

        const data = await response.json();
        setAddresses(data.addresses || []);
        
        // If no addresses, force open the modal for gating
        if (!data.addresses || data.addresses.length === 0) {
          setShowAddressModal(true);
          setModalForceOpen(true);
        }
      } catch (err: any) {
        setAddressesError(err.message || "Failed to load addresses");
      } finally {
        setAddressesLoading(false);
      }
    };

    fetchAddresses();
  }, [sessionStatus]);

  // Handle add address in checkout gating
  const handleAddAddressInCheckout = async (addressData: any) => {
    try {
      const response = await fetch("/api/my-account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save address");
      }

      // Refresh addresses list
      await fetch("/api/my-account/addresses", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data) => {
          setAddresses(data.addresses || []);
          setShowAddressModal(false);
          setModalForceOpen(false);
        });
    } catch (err: any) {
      throw err; // Re-throw to show error in modal
    }
  };

  // Handle form submission
  const handleCheckoutSubmit = async (formData: CheckoutFormData) => {
    setError("");
    setIsSubmitting(true);

    try {
      const selectedAddr = formData.selectedAddressId
        ? addresses.find((a) => a.id === formData.selectedAddressId)
        : null;

      if (!selectedAddr) {
        throw new Error("Selected address not found");
      }

      const shippingPayload = buildShippingPayload({
        shippingName: formData.shippingName,
        shippingPhone: formData.shippingPhone,
        shippingAddressLine1: formData.shippingAddressLine1,
        shippingAddressLine2: formData.shippingAddressLine2,
        selectedAddress: selectedAddr,
      });

      // 1) Create order (PENDING_PAYMENT)
      const createResponse = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: formData.selectedAddressId,
          shippingName: shippingPayload.shippingName,
          shippingPhone: shippingPayload.shippingPhone,
          shippingAddressLine1: shippingPayload.shippingAddressLine1,
          shippingAddressLine2: shippingPayload.shippingAddressLine2,
          shippingArea: shippingPayload.shippingArea,
          shippingEmirate: shippingPayload.shippingEmirate,
          shippingNotes: formData.shippingNotes,
          acceptedTerms: formData.acceptedTerms,
          acceptedDisclaimer: formData.acceptedDisclaimer,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        console.error("[CHECKOUT] Create order failed:", createData);
        throw new Error(createData.error || "Failed to create order");
      }

      // 2) Create Stripe session
      const sessionResponse = await fetch("/api/checkout/stripe-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: createData.orderId }),
      });

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok) {
        console.error("[CHECKOUT] Stripe session failed:", sessionData);
        throw new Error(sessionData.error || "Failed to create payment session");
      }

      if (!sessionData.url) {
        console.error("[CHECKOUT] Stripe session URL missing:", sessionData);
        throw new Error("No payment session URL returned");
      }

      window.location.assign(sessionData.url);
    } catch (err: any) {
      console.error("[CHECKOUT] Error:", err);
      setError(err.message || "An error occurred during checkout");
      setIsSubmitting(false);
    }
  };

  // Loading state (FIXED: Wait for cart hydration)
  if (sessionStatus === "loading" || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Cart is empty
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12">
            <p className="text-lg text-gray-600 mb-4">Your cart is empty</p>
            <Link href="/marketplace" className="text-primary hover:underline">
              Continue shopping
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // REMOVED: Location not selected check
  // Address requirement is handled via AddressModal gating instead

  const total = getTotalPrice();

  // Prepare order items for summary with proper price normalization
  const orderItems = items.map((item) => {
    // Handle both DB cart items (unitPriceFils) and local cart items (product.price)
    const isDBItem = (item as any).unitPriceFils !== undefined;
    const unitPriceAED = isDBItem
      ? (item as any).unitPriceFils / 100
      : (item as any).product?.price || 0;

    const product = isDBItem ? (item as any).product : item as any;

    return {
      id: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: unitPriceAED,
      lineTotal: unitPriceAED * item.quantity,
    };
  });

  // If user has 0 addresses and modal is forced open, block checkout
  if (addresses.length === 0 && modalForceOpen) {
    return (
      <>
        <CheckoutProgress currentStep="shipping" />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Secure Checkout</h1>
            <p className="text-gray-600">Complete your order securely</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-900 font-medium">
              You need to add a delivery address before proceeding with checkout.
            </p>
          </div>
        </div>

        <AddressModal
          isOpen={showAddressModal}
          onClose={() => {
            // Don't allow closing if forced open and no addresses exist
            if (addresses.length === 0) return;
            setShowAddressModal(false);
          }}
          onSave={handleAddAddressInCheckout}
        />
      </>
    );
  }

  return (
    <>
      {/* Progress Bar */}
      <CheckoutProgress currentStep="shipping" />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Secure Checkout</h1>
          <p className="text-gray-600">Complete your order securely</p>
        </div>

        {/* Compliance Disclaimer */}
        <div className="mb-8">
          <ComplianceDisclaimer />
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form - Left Side */}
          <div className="lg:col-span-2">
            <CheckoutForm
              addresses={addresses}
              addressesLoading={addressesLoading}
              onAddAddress={() => {
                setShowAddressModal(true);
                setModalForceOpen(true);
              }}
              onSubmit={handleCheckoutSubmit}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Summary - Right Side */}
          <div>
            <CheckoutSummary
              items={orderItems}
              subtotal={total}
              deliveryFee={0}
              tax={0}
              total={total}
              isLoading={isSubmitting}
            />
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-12 py-6 border-t text-center text-sm text-gray-600">
          <p>🔒 Your payment information is secure and encrypted</p>
          <p className="text-xs text-gray-500 mt-2">
            Payments processed by Stripe. Your personal data is protected.
          </p>
        </div>
      </div>

      {/* Address modal for adding during checkout */}
      <AddressModal
        isOpen={showAddressModal && !modalForceOpen}
        onClose={() => setShowAddressModal(false)}
        onSave={handleAddAddressInCheckout}
      />
    </>
  );
}
