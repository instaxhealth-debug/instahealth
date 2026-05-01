"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Phone, Mail, User } from "lucide-react";

interface Product {
  id: string;
  name: string;
  priceFils: number;
  durationMinutes?: number | null;
  variants?: Array<{
    id: string;
    strength: string;
    priceFils: number;
  }>;
}

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
}

export function BookingModal({ open, onClose, product }: BookingModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    address: "",
    preferredDate: "",
    preferredTimeWindow: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.customerName.trim()) errors.push("Name is required");
    if (!formData.customerEmail.trim()) errors.push("Email is required");
    if (!formData.customerPhone.trim()) errors.push("Phone is required");
    if (!formData.address.trim()) errors.push("Address is required");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.customerEmail && !emailRegex.test(formData.customerEmail)) {
      errors.push("Invalid email format");
    }

    // Phone validation
    const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
    if (formData.customerPhone && !phoneRegex.test(formData.customerPhone)) {
      errors.push("Invalid phone format");
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create booking
      const bookingRes = await fetch("/api/bookings/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariantId,
          ...formData,
        }),
      });

      const bookingData = await bookingRes.json();

      if (!bookingRes.ok || !bookingData.ok) {
        throw new Error(bookingData.error || "Failed to create booking");
      }

      // Create Stripe checkout
      const checkoutRes = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: bookingData.bookingId }),
      });

      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok || !checkoutData.url) {
        throw new Error(checkoutData.error || "Failed to create checkout");
      }

      // Redirect to Stripe
      window.location.href = checkoutData.url;
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const selectedPrice = selectedVariantId
    ? product.variants?.find((v) => v.id === selectedVariantId)?.priceFils || product.priceFils
    : product.priceFils;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {product.name}</DialogTitle>
          <DialogDescription>
            Fill in your details and preferred time to book this service
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Variant Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="variant">Select Option</Label>
              <select
                id="variant"
                value={selectedVariantId || ""}
                onChange={(e) => setSelectedVariantId(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Base Option - AED {(product.priceFils / 100).toFixed(2)}</option>
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.strength} - AED {(variant.priceFils / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                <User className="inline h-4 w-4 mr-1" />
                Full Name *
              </Label>
              <Input
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number *
              </Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="+971 50 123 4567"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">
              <Mail className="inline h-4 w-4 mr-1" />
              Email Address *
            </Label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={handleChange}
              placeholder="john@example.com"
              required
            />
          </div>

          {/* Service Location */}
          <div className="space-y-2">
            <Label htmlFor="address">
              <MapPin className="inline h-4 w-4 mr-1" />
              Service Address *
            </Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Building, Street, Area, City"
              required
            />
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferredDate">
                <Calendar className="inline h-4 w-4 mr-1" />
                Preferred Date
              </Label>
              <Input
                id="preferredDate"
                name="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTimeWindow">
                <Clock className="inline h-4 w-4 mr-1" />
                Preferred Time Window
              </Label>
              <select
                id="preferredTimeWindow"
                name="preferredTimeWindow"
                value={formData.preferredTimeWindow}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Any time</option>
                <option value="Morning (8 AM - 12 PM)">Morning (8 AM - 12 PM)</option>
                <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special requests or instructions..."
              rows={3}
            />
          </div>

          {/* Price Summary */}
          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <span className="font-semibold">Total Amount</span>
            <span className="text-2xl font-bold">
              AED {(selectedPrice / 100).toFixed(2)}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Proceed to Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
