"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Trash2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethod {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/my-account/payments`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to add card",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Card added successfully",
        });
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while adding the card",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? "Adding..." : "Add Card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PaymentMethodsClient() {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch("/api/payments/methods");
      if (!response.ok) throw new Error("Failed to fetch payment methods");
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleAddCardClick = async () => {
    try {
      const response = await fetch("/api/payments/setup-intent", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to create setup intent");

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowAddCard(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize card setup",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCard = async (paymentMethodId: string) => {
    if (!confirm("Are you sure you want to remove this card?")) {
      return;
    }

    setDeletingId(paymentMethodId);

    try {
      const response = await fetch("/api/payments/methods/detach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) throw new Error("Failed to remove card");

      toast({
        title: "Success",
        description: "Card removed successfully",
      });

      await fetchPaymentMethods();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove card",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSuccess = async () => {
    setShowAddCard(false);
    setClientSecret(null);
    await fetchPaymentMethods();
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Payment Details</h2>
        {!showAddCard && (
          <button
            onClick={handleAddCardClick}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        )}
      </div>

      {showAddCard && clientSecret ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Add New Card</h3>
            <button
              onClick={() => {
                setShowAddCard(false);
                setClientSecret(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#0d9488",
                },
              },
            }}
          >
            <AddCardForm onSuccess={handleAddSuccess} onCancel={() => {
              setShowAddCard(false);
              setClientSecret(null);
            }} />
          </Elements>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold mb-4">Saved Cards</h3>
          {paymentMethods.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No saved cards yet</p>
              <p className="text-sm mt-1">Add a card to save it for future purchases</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-6 h-6 text-gray-400" />
                    <div>
                      <div className="font-medium capitalize">
                        {pm.brand} •••• {pm.last4}
                      </div>
                      <div className="text-sm text-gray-500">
                        Expires {pm.exp_month}/{pm.exp_year}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCard(pm.id)}
                    disabled={deletingId === pm.id}
                    className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
