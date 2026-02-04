"use client";

import { useState, useEffect } from "react";
import { updatePersonalDetails } from "@/app/actions/updatePersonalDetails";
import { useToast } from "@/hooks/use-toast";

interface PersonalDetailsFormProps {
  initialData: {
    name: string;
    email: string;
    phone: string;
    countryCode: string;
  };
}

const COUNTRY_CODES = [
  { code: "+971", country: "United Arab Emirates" },
  { code: "+61", country: "Australia" },
  { code: "+1", country: "United States" },
  { code: "+44", country: "United Kingdom" },
];

export function PersonalDetailsForm({ initialData }: PersonalDetailsFormProps) {
  const { toast } = useToast();

  // Extract mobile number without country code
  const extractMobileNumber = (phone: string, countryCode: string) => {
    if (!phone) return "";
    if (phone.startsWith(countryCode)) {
      return phone.slice(countryCode.length);
    }
    return phone;
  };

  const [formData, setFormData] = useState({
    name: initialData.name || "",
    email: initialData.email || "",
    countryCode: initialData.countryCode || "+971",
    mobileNumber: extractMobileNumber(initialData.phone || "", initialData.countryCode || "+971"),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check for changes
  useEffect(() => {
    const changed =
      formData.name !== (initialData.name || "") ||
      formData.email !== (initialData.email || "") ||
      formData.countryCode !== (initialData.countryCode || "+971") ||
      formData.mobileNumber !== extractMobileNumber(initialData.phone || "", initialData.countryCode || "+971");
    setHasChanges(changed);
  }, [formData, initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updatePersonalDetails(formData);
      if (result.success) {
        toast({ title: "Saved", description: "Your personal details have been updated." });
        setHasChanges(false);
      } else {
        toast({ title: "Error", description: result.error || "Failed to save changes", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred while saving", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with title and save button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Personal Details</h2>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`
            px-6 py-2 rounded-lg font-medium transition-all
            ${
              !hasChanges || isSaving
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }
          `}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Name field */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="
              w-full px-0 py-2 text-gray-900
              border-0 border-b-2 border-gray-300
              focus:border-teal-600 focus:ring-0 focus:outline-none
              transition-colors
            "
            placeholder="Enter your full name"
          />
        </div>

        {/* Country code + Mobile number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
              Country code *
            </label>
            <select
              id="countryCode"
              value={formData.countryCode}
              onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
              className="
                w-full px-0 py-2 text-gray-900
                border-0 border-b-2 border-gray-300
                focus:border-teal-600 focus:ring-0 focus:outline-none
                transition-colors
                bg-transparent
              "
            >
              {COUNTRY_CODES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.country} ({item.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
              Mobile number *
            </label>
            <input
              id="mobileNumber"
              type="tel"
              value={formData.mobileNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                setFormData({ ...formData, mobileNumber: value });
              }}
              className="
                w-full px-0 py-2 text-gray-900
                border-0 border-b-2 border-gray-300
                focus:border-teal-600 focus:ring-0 focus:outline-none
                transition-colors
              "
              placeholder="545988544"
            />
          </div>
        </div>

        {/* Email field */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address *
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="
              w-full px-0 py-2 text-gray-900
              border-0 border-b-2 border-gray-300
              focus:border-teal-600 focus:ring-0 focus:outline-none
              transition-colors
            "
            placeholder="your.email@example.com"
          />
        </div>
      </div>
    </div>
  );
}
