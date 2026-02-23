"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Product {
  id: string;
  name: string;
  priceFils: number;
  category: string;
  bookingUrl?: string | null;
  vendor: {
    id: string;
    name: string;
    bookingUrl?: string | null;
    enforceServiceRadius: boolean;
  };
}

interface BookingCheckoutClientProps {
  product: Product;
}

function PaymentForm({
  bookingId,
  onSuccess,
}: {
  bookingId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create PaymentIntent
      const res = await fetch("/api/bookings/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const { clientSecret, error } = await res.json();

      if (error) {
        throw new Error(error);
      }

      // Confirm card payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      toast({
        title: "Payment successful!",
        description: "Redirecting to confirmation...",
      });

      onSuccess();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
            },
          }}
        />
      </div>
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Complete Payment"
        )}
      </Button>
    </form>
  );
}

export function BookingCheckoutClient({ product }: BookingCheckoutClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"elements" | "checkout" | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const priceAED = (product.priceFils / 100).toFixed(2);

  const handleCreateBooking = async () => {
    // Validation
    if (!customerName || !customerEmail || !customerPhone) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!address) {
      toast({
        title: "Address required",
        description: "Please select your service address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          customerName,
          customerEmail,
          customerPhone,
          address,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      setBookingId(data.bookingId);
      return data.bookingId;
    } catch (error) {
      console.error("Booking creation error:", error);
      toast({
        title: "Booking failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setIsLoading(false);
      return null;
    }
  };

  const handleExpressCheckout = async () => {
    const newBookingId = await handleCreateBooking();
    if (!newBookingId) return;

    try {
      const res = await fetch("/api/bookings/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: newBookingId }),
      });

      const { url, error } = await res.json();

      if (error) {
        throw new Error(error);
      }

      window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handlePayOnPage = async () => {
    const newBookingId = await handleCreateBooking();
    if (!newBookingId) return;

    setPaymentMethod("elements");
    setIsLoading(false);
  };

  const handlePaymentSuccess = () => {
    router.push(`/book/success?bookingId=${bookingId}`);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Book Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              Provided by: {product.vendor.name}
            </p>
            <p className="text-2xl font-bold">AED {priceAED}</p>
          </div>

          {/* Customer Information */}
          {!bookingId && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+971 50 123 4567"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Service Address *</Label>
                  <GooglePlacesAutocomplete
                    onSelect={(place) => setAddress(place)}
                    placeholder="Enter your address"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions or requests..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Payment Options */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold">Choose Payment Method</h3>

                <Button
                  onClick={handlePayOnPage}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Pay on this page"
                  )}
                </Button>

                <Button
                  onClick={handleExpressCheckout}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Express Checkout"
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Embedded Payment Form */}
          {bookingId && paymentMethod === "elements" && (
            <Elements stripe={stripePromise}>
              <div className="space-y-4">
                <h3 className="font-semibold">Complete Payment</h3>
                <PaymentForm bookingId={bookingId} onSuccess={handlePaymentSuccess} />
              </div>
            </Elements>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Note:</strong> Payment reserves your booking. After payment, you&apos;ll select
          your exact time slot with the provider. Full refund available if scheduling cannot
          be completed.
        </p>
      </div>
    </div>
  );
}
