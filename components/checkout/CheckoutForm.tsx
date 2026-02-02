"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, CheckCircle, Phone, MapPin } from "lucide-react";

interface Address {
  id: string;
  label: string;
  formattedAddress: string;
}

interface CheckoutFormProps {
  addresses: Address[];
  addressesLoading: boolean;
  onSubmit: (formData: CheckoutFormData) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
  successMessage?: string;
}

export interface CheckoutFormData {
  shippingName: string;
  shippingPhone: string;
  selectedAddressId?: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingNotes: string;
  ageConfirmed: boolean;
  acceptedTerms: boolean;
  acceptedDisclaimer: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export function CheckoutForm({
  addresses,
  addressesLoading,
  onSubmit,
  isSubmitting,
  error,
  successMessage,
}: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    shippingName: "",
    shippingPhone: "",
    selectedAddressId: "",
    shippingAddressLine1: "",
    shippingAddressLine2: "",
    shippingNotes: "",
    ageConfirmed: false,
    acceptedTerms: false,
    acceptedDisclaimer: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [useNewAddress, setUseNewAddress] = useState(!addresses.length);

  // Validation logic
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.shippingName.trim()) {
      newErrors.shippingName = "Name is required";
    } else if (formData.shippingName.trim().length < 2) {
      newErrors.shippingName = "Name must be at least 2 characters";
    }

    // Phone validation (UAE format)
    const phoneRegex = /^(?:\+971|0)(?:50|51|52|54|55|56|2|3|4|6|7|9)\d{7}$/;
    if (!formData.shippingPhone.trim()) {
      newErrors.shippingPhone = "Phone number is required";
    } else if (!phoneRegex.test(formData.shippingPhone.replace(/\s/g, ""))) {
      newErrors.shippingPhone = "Please enter a valid UAE phone number";
    }

    // Address validation
    if (useNewAddress) {
      if (!formData.shippingAddressLine1.trim()) {
        newErrors.shippingAddressLine1 = "Address line 1 is required";
      }
    } else if (!formData.selectedAddressId) {
      newErrors.selectedAddressId = "Please select a saved address";
    }

    // Checkboxes validation
    if (!formData.ageConfirmed) {
      newErrors.ageConfirmed = "You must confirm you're 21 or older";
    }
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = "You must accept the terms and conditions";
    }
    if (!formData.acceptedDisclaimer) {
      newErrors.acceptedDisclaimer = "You must accept the disclaimer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, useNewAddress]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error for this field when user starts typing
    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      // Error is handled by parent component
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900">Success</h3>
            <p className="text-sm text-green-800 mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <Input
                type="text"
                name="shippingName"
                value={formData.shippingName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="John Doe"
                disabled={isSubmitting}
                className={errors.shippingName && touched.shippingName ? "border-red-500" : ""}
              />
              {errors.shippingName && touched.shippingName && (
                <p className="text-sm text-red-600 mt-1">{errors.shippingName}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </label>
              <Input
                type="tel"
                name="shippingPhone"
                value={formData.shippingPhone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="+971 50 xxx xxxx"
                disabled={isSubmitting}
                className={errors.shippingPhone && touched.shippingPhone ? "border-red-500" : ""}
              />
              <p className="text-xs text-gray-500 mt-1">UAE phone numbers required</p>
              {errors.shippingPhone && touched.shippingPhone && (
                <p className="text-sm text-red-600 mt-1">{errors.shippingPhone}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address Toggle */}
            {addresses.length > 0 && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    value="saved"
                    checked={!useNewAddress}
                    onChange={() => setUseNewAddress(false)}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm">Use Saved Address</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    value="new"
                    checked={useNewAddress}
                    onChange={() => setUseNewAddress(true)}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm">Enter New Address</span>
                </label>
              </div>
            )}

            {/* Saved Address Selection */}
            {!useNewAddress && addresses.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Address
                </label>
                {addressesLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">Loading addresses...</span>
                  </div>
                ) : (
                  <select
                    name="selectedAddressId"
                    value={formData.selectedAddressId}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.selectedAddressId && touched.selectedAddressId
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="">Select an address...</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} - {addr.formattedAddress}
                      </option>
                    ))}
                  </select>
                )}
                {errors.selectedAddressId && touched.selectedAddressId && (
                  <p className="text-sm text-red-600 mt-1">{errors.selectedAddressId}</p>
                )}
              </div>
            )}

            {/* New Address Input */}
            {useNewAddress && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 *
                  </label>
                  <Input
                    type="text"
                    name="shippingAddressLine1"
                    value={formData.shippingAddressLine1}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Street address, apartment, etc"
                    disabled={isSubmitting}
                    className={
                      errors.shippingAddressLine1 && touched.shippingAddressLine1
                        ? "border-red-500"
                        : ""
                    }
                  />
                  {errors.shippingAddressLine1 && touched.shippingAddressLine1 && (
                    <p className="text-sm text-red-600 mt-1">{errors.shippingAddressLine1}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <Input
                    type="text"
                    name="shippingAddressLine2"
                    value={formData.shippingAddressLine2}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Building, floor, apartment number, etc"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Notes (Optional)
              </label>
              <Textarea
                name="shippingNotes"
                value={formData.shippingNotes}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="E.g., instructions for delivery driver, gate codes, etc."
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Compliance & Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirmations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="ageConfirmed"
                checked={formData.ageConfirmed}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">
                I confirm that I am 21 years or older
              </span>
            </label>
            {errors.ageConfirmed && touched.ageConfirmed && (
              <p className="text-sm text-red-600 -mt-2">{errors.ageConfirmed}</p>
            )}

            <label className="flex gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="acceptedTerms"
                checked={formData.acceptedTerms}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">
                I accept the{" "}
                <a href="#" className="text-primary hover:underline">
                  terms and conditions
                </a>
              </span>
            </label>
            {errors.acceptedTerms && touched.acceptedTerms && (
              <p className="text-sm text-red-600 -mt-2">{errors.acceptedTerms}</p>
            )}

            <label className="flex gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="acceptedDisclaimer"
                checked={formData.acceptedDisclaimer}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">
                I accept the{" "}
                <a href="#" className="text-primary hover:underline">
                  product disclaimer
                </a>
              </span>
            </label>
            {errors.acceptedDisclaimer && touched.acceptedDisclaimer && (
              <p className="text-sm text-red-600 -mt-2">{errors.acceptedDisclaimer}</p>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-base font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Payment...
            </>
          ) : (
            "Proceed to Payment"
          )}
        </Button>
      </form>
    </div>
  );
}
