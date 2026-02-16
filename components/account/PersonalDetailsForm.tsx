"use client";

import { useState, useEffect, useMemo } from "react";
import { updatePersonalDetails } from "@/app/actions/updatePersonalDetails";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES } from "@/lib/countries";

interface PersonalDetailsFormProps {
  initialData: {
    name: string;
    email: string;
    phone: string;
    countryCode: string;
  };
}

export function PersonalDetailsForm({ initialData }: PersonalDetailsFormProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

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

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return ALL_COUNTRIES;
    const query = searchQuery.toLowerCase();
    return ALL_COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.callingCode.includes(query) ||
        country.iso2.toLowerCase() ===query
    );
  }, [searchQuery]);

  // Find selected country
  const selectedCountry = useMemo(
    () => ALL_COUNTRIES.find((c) => c.callingCode === formData.countryCode),
    [formData.countryCode]
  );

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

  const handleCountrySelect = (country: typeof ALL_COUNTRIES[0]) => {
    setFormData({ ...formData, countryCode: country.callingCode });
    setShowCountryDropdown(false);
    setSearchQuery("");
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
          <div className="space-y-2 relative">
            <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
              Country code *
            </label>
            <div className="relative">
              <input
                id="countryCode"
                type="text"
                value={showCountryDropdown ? searchQuery : selectedCountry?.name || ""}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowCountryDropdown(true);
                }}
                onFocus={() => setShowCountryDropdown(true)}
                className="
                  w-full px-0 py-2 text-gray-900
                  border-0 border-b-2 border-gray-300
                  focus:border-teal-600 focus:ring-0 focus:outline-none
                  transition-colors
                "
                placeholder="Search country..."
                autoComplete="off"
              />
              {selectedCountry && !showCountryDropdown && (
                <div className="absolute right-0 bottom-2 text-sm text-gray-500">
                  {selectedCountry.callingCode}
                </div>
              )}
            </div>

            {/* Country dropdown */}
            {showCountryDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setShowCountryDropdown(false);
                    setSearchQuery("");
                  }}
                />
                <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                  {filteredCountries.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No countries found</div>
                  ) : (
                    filteredCountries.map((country) => (
                      <button
                        key={country.iso2}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className="w-full px-4 py-2 text-left hover:bg-teal-50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-900">{country.name}</span>
                        <span className="text-sm text-gray-500">{country.callingCode}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
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
