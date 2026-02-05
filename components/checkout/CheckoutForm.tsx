"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Phone, MapPin } from "lucide-react";
import { ValidationCallout } from "./ValidationCallout";

interface Address {
  id: string;
  label: string;
  formattedAddress: string;
  phone?: string;
  line1?: string;
  line2?: string;
  area?: string;
  city?: string;
  emirate?: string;
  instructions?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  isDefault?: boolean;
}

interface CheckoutFormProps {
  addresses: Address[];
  addressesLoading: boolean;
  onSubmit: (formData: CheckoutFormData) => Promise<void>;
  onAddAddress: () => void;
  isSubmitting: boolean;
  successMessage?: string;
}

export interface CheckoutFormData {
  shippingName: string;
  shippingPhone: string;
  selectedAddressId?: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingNotes: string;
  acceptedTerms: boolean;
  acceptedDisclaimer: boolean;
}

interface FormErrors {
  [key: string]: string;
}

interface TouchedFields {
  shippingName?: boolean;
  shippingPhone?: boolean;
  selectedAddressId?: boolean;
  acceptedTerms?: boolean;
  acceptedDisclaimer?: boolean;
}

export function CheckoutForm({
  addresses,
  addressesLoading,
  onSubmit,
  onAddAddress,
  isSubmitting,
  successMessage,
}: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    shippingName: "",
    shippingPhone: "",
    selectedAddressId: "",
    shippingAddressLine1: "",
    shippingAddressLine2: "",
    shippingNotes: "",
    acceptedTerms: false,
    acceptedDisclaimer: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [useNewAddress, setUseNewAddress] = useState(!addresses.length);
  const [addressesInitialized, setAddressesInitialized] = useState(false);

  // Auto-select default address when addresses load
  useEffect(() => {
    if (addresses.length > 0 && !addressesInitialized) {
      setUseNewAddress(false);
      const defaultAddress = addresses.find((addr) => addr.isDefault);
      if (defaultAddress) {
        setFormData((prev) => ({
          ...prev,
          selectedAddressId: defaultAddress.id,
        }));
      } else if (addresses.length === 1) {
        // If only one address, select it
        setFormData((prev) => ({
          ...prev,
          selectedAddressId: addresses[0].id,
        }));
      }
      setAddressesInitialized(true);
    }
  }, [addresses, addressesInitialized]);


  // Validation logic - only validates fields that are relevant
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
    if (!formData.selectedAddressId) {
      newErrors.selectedAddressId = "Please select a delivery address";
    }

    // Checkboxes validation
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = "Please accept the terms and conditions";
    }
    if (!formData.acceptedDisclaimer) {
      newErrors.acceptedDisclaimer = "Please accept the product disclaimer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Get errors to show: only show if submitAttempted OR field touched
  const getFieldError = (fieldName: string): string | undefined => {
    if (submitAttempted || touched[fieldName as keyof TouchedFields]) {
      return errors[fieldName];
    }
    return undefined;
  };

  // Check if field should show as invalid
  const isFieldInvalid = (fieldName: string): boolean => {
    return !!(getFieldError(fieldName));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Mark field as touched on change
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      // Error is handled by parent component
    }
  };

  // Check form validity for button state
  const phoneRegex = /^(?:\+971|0)(?:50|51|52|54|55|56|2|3|4|6|7|9)\d{7}$/;
  const isPhoneValid = formData.shippingPhone && phoneRegex.test(formData.shippingPhone.replace(/\s/g, ""));
  const isFormValid =
    formData.shippingName.trim().length >= 2 &&
    isPhoneValid &&
    !!formData.selectedAddressId &&
    formData.acceptedTerms &&
    formData.acceptedDisclaimer;

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Delivery Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="shippingName"
                value={formData.shippingName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="John Doe"
                disabled={isSubmitting}
                className={isFieldInvalid("shippingName") ? "border-red-500 focus:ring-red-500" : ""}
              />
              {getFieldError("shippingName") && (
                <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1">
                  <span className="h-1 w-1 bg-red-600 rounded-full" />
                  {getFieldError("shippingName")}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                name="shippingPhone"
                value={formData.shippingPhone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="+971 50 xxx xxxx"
                disabled={isSubmitting}
                className={isFieldInvalid("shippingPhone") ? "border-red-500 focus:ring-red-500" : ""}
              />
              <p className="text-xs text-gray-500 mt-1">UAE phone numbers required</p>
              {getFieldError("shippingPhone") && (
                <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1">
                  <span className="h-1 w-1 bg-red-600 rounded-full" />
                  {getFieldError("shippingPhone")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Address
              </CardTitle>
              <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded">
                Required
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address Mode Toggle - Only show if multiple addresses */}
            {addresses.length > 0 && (
              <div className="flex gap-6 pb-1">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded">
                  <input
                    type="radio"
                    name="addressType"
                    value="saved"
                    checked={!useNewAddress}
                    onChange={() => setUseNewAddress(false)}
                    disabled={isSubmitting}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Use Saved Address</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded">
                  <input
                    type="radio"
                    name="addressType"
                    value="new"
                    checked={useNewAddress}
                    onChange={() => setUseNewAddress(true)}
                    disabled={isSubmitting}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Enter New Address</span>
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
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading addresses...</span>
                  </div>
                ) : (
                  <>
                    <select
                      name="selectedAddressId"
                      value={formData.selectedAddressId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
                        isFieldInvalid("selectedAddressId")
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-primary"
                      }`}
                    >
                      <option value="">Select an address...</option>
                      {addresses.map((addr) => {
                        const defaultBadge = addr.isDefault ? " (Default)" : "";
                        const shortAddr =
                          addr.area && addr.emirate
                            ? `${addr.area}, ${addr.emirate}`
                            : addr.formattedAddress.length > 50
                              ? addr.formattedAddress.substring(0, 50) + "..."
                              : addr.formattedAddress;
                        return (
                          <option key={addr.id} value={addr.id}>
                            {addr.label.toUpperCase()}
                            {defaultBadge} • {shortAddr}
                          </option>
                        );
                      })}
                    </select>
                    <a
                      href="/my-account/delivery-addresses"
                      className="inline-block text-xs text-primary hover:underline mt-2"
                    >
                      Manage addresses
                    </a>
                  </>
                )}
                {getFieldError("selectedAddressId") && (
                  <ValidationCallout message={getFieldError("selectedAddressId")!} />
                )}
              </div>
            )}

            {/* New Address CTA */}
            {useNewAddress && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10"
                  onClick={onAddAddress}
                  disabled={isSubmitting}
                >
                  Add new address
                </Button>
                {getFieldError("selectedAddressId") && (
                  <ValidationCallout message={getFieldError("selectedAddressId")!} />
                )}
              </div>
            )}

            {/* Delivery Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Notes <span className="text-xs text-gray-500 font-normal">(Optional)</span>
              </label>
              <Textarea
                name="shippingNotes"
                value={formData.shippingNotes}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="E.g., instructions for delivery driver, gate codes, etc."
                disabled={isSubmitting}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Confirmations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirmations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex gap-3 cursor-pointer p-2 -m-2 rounded hover:bg-gray-50">
              <input
                type="checkbox"
                name="acceptedTerms"
                checked={formData.acceptedTerms}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-4 h-4 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I accept the{" "}
                <a href="#" className="text-primary hover:underline font-medium">
                  terms and conditions
                </a>
              </span>
            </label>
            {getFieldError("acceptedTerms") && (
              <ValidationCallout message={getFieldError("acceptedTerms")!} />
            )}

            <label className="flex gap-3 cursor-pointer p-2 -m-2 rounded hover:bg-gray-50">
              <input
                type="checkbox"
                name="acceptedDisclaimer"
                checked={formData.acceptedDisclaimer}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-4 h-4 mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I accept the{" "}
                <a href="#" className="text-primary hover:underline font-medium">
                  product disclaimer
                </a>
              </span>
            </label>
            {getFieldError("acceptedDisclaimer") && (
              <ValidationCallout message={getFieldError("acceptedDisclaimer")!} />
            )}
          </CardContent>
        </Card>

        {/* Submit Button - Sticky on mobile */}
        <div className="lg:static fixed bottom-0 left-0 right-0 lg:p-0 p-4 bg-white lg:bg-transparent border-t lg:border-t-0 z-10">
          {!isFormValid && !submitAttempted && (
            <p className="text-xs text-gray-500 text-center mb-2">
              Complete all required fields to proceed
            </p>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || !isFormValid}
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
        </div>
      </form>
    </div>
  );
}
