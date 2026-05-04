"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, CreditCard, ChevronRight, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { TimeSlotPicker } from "@/components/bookings/TimeSlotPicker";

interface Product {
  id: string;
  name: string;
  priceFils: number;
  imageUrl: string | null;
  serviceType?: string;
  durationMinutes?: number | null;
  variants?: Array<{
    id: string;
    strength: string;
    priceFils: number;
  }>;
  vendor: {
    name: string;
    slug: string;
  };
}

interface BookingStepModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

type Step = 1 | 2 | 3 | 4;

const TIME_WINDOWS = ["Morning (8am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-9pm)", "Exact time (I will specify)"];

export function BookingStepModal({ open, onClose, product }: BookingStepModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [exactTime, setExactTime] = useState("");
  // MARKETPLACE: Real time slots
  const [scheduledStart, setScheduledStart] = useState<string>("");
  const [scheduledEnd, setScheduledEnd] = useState<string>("");
  const [address, setAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const selectedVariantData = product.variants?.find(v => v.id === selectedVariant);
  const finalPrice = selectedVariantData ? selectedVariantData.priceFils : product.priceFils;

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedVariant(null);
    setPreferredDate("");
    setTimeWindow("");
    setExactTime("");
    setAddress("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        return product.variants ? !!selectedVariant : true;
      case 2:
        // MARKETPLACE: Require real time slot selection
        return !!scheduledStart && !!scheduledEnd;
      case 3:
        return !!address && !!customerName && !!customerEmail && !!customerPhone;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1) as Step);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as Step);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);

    try {
      // Create booking
      const createResponse = await fetch("/api/bookings/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant,
          customerName,
          customerEmail,
          customerPhone,
          address,
          // MARKETPLACE: Send real time slots
          scheduledStart,
          scheduledEnd,
          notes,
          // Price is calculated server-side, not sent from client
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create booking");
      }

      const { booking } = await createResponse.json();

      // Create checkout session
      const checkoutResponse = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!checkoutResponse.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await checkoutResponse.json();
      window.location.href = url;
    } catch (error) {
      console.error("[BOOKING:SUBMIT] Failed to create booking", error);
      alert("Failed to create booking. Please try again.");
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.vendor.name}</p>
                <p className="text-lg font-bold mt-1">AED {(finalPrice / 100).toFixed(2)}</p>
                {product.durationMinutes && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {product.durationMinutes} minutes
                  </p>
                )}
              </div>
            </div>

            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <Label>Select Service Option *</Label>
                <div className="grid gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        selectedVariant === variant.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{variant.strength}</span>
                        <span className="font-bold">AED {(variant.priceFils / 100).toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <TimeSlotPicker
              vendorId={product.vendor.slug}
              productId={product.id}
              onSlotSelect={(start, end) => {
                setScheduledStart(start);
                setScheduledEnd(end);
              }}
              selectedStart={scheduledStart}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Service Address *</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter the full address where the service will be provided"
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email Address *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+971 50 123 4567"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or requirements?"
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground">Service</h4>
                <p className="font-medium">{product.name}</p>
                {selectedVariantData && (
                  <p className="text-sm text-muted-foreground">{selectedVariantData.strength}</p>
                )}
                <p className="text-sm text-muted-foreground">{product.vendor.name}</p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{scheduledStart ? new Date(scheduledStart).toLocaleDateString("en-US", { dateStyle: "full" }) : "Not selected"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {scheduledStart && scheduledEnd
                    ? `${new Date(scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - ${new Date(scheduledEnd).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                    : "Not selected"}
                </span>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="flex-1">{address}</span>
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold">AED {(finalPrice / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              <p className="font-medium">What happens next?</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                <li>Complete secure payment via Stripe</li>
                <li>Vendor will confirm your appointment</li>
                <li>You&apos;ll receive confirmation email and SMS</li>
              </ol>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Book Service</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    step <= currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              Step {currentStep} of 4:
            </span>
            <span>
              {currentStep === 1 && "Service Details"}
              {currentStep === 2 && "Date & Time"}
              {currentStep === 3 && "Contact & Address"}
              {currentStep === 4 && "Review & Pay"}
            </span>
          </div>

          {renderStep()}
        </div>

        <div className="flex gap-2 border-t pt-4">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep} disabled={loading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
              className="flex-1"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Continue to Secure Payment
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
