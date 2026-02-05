"use client";

import { useState, useEffect } from "react";
import { WheelPicker } from "@/components/account/WheelPicker";

interface PersonalDataClientProps {
  initialData: {
    heightCm: number | null;
    weightKg: number | null;
    consentShareBodyMetrics: boolean;
    marketingPushOptIn: boolean;
    marketingEmailOptIn: boolean;
  };
}

// Helper functions for height conversion
function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54);
}

// Generate height options from 4'0" to 7'0" in 1-inch increments
function generateHeightOptions() {
  const options = [];
  for (let feet = 4; feet <= 7; feet++) {
    const maxInches = feet === 7 ? 0 : 11;
    for (let inches = 0; inches <= maxInches; inches++) {
      const cm = feetInchesToCm(feet, inches);
      options.push({
        value: cm,
        label: `${feet}'${inches}"`,
      });
    }
  }
  return options;
}

// Generate weight options from 30kg to 200kg
function generateWeightOptions() {
  const options = [];
  for (let kg = 30; kg <= 200; kg++) {
    options.push({
      value: kg,
      label: `${kg} kg`,
    });
  }
  return options;
}

export function PersonalDataClient({ initialData }: PersonalDataClientProps) {
  const [heightCm, setHeightCm] = useState<number>(initialData.heightCm || 183); // Default 6'0"
  const [weightKg, setWeightKg] = useState<number>(initialData.weightKg || 100);
  const [consentShareBodyMetrics, setConsentShareBodyMetrics] = useState(initialData.consentShareBodyMetrics);
  const [marketingPushOptIn, setMarketingPushOptIn] = useState(initialData.marketingPushOptIn);
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(initialData.marketingEmailOptIn);
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);

  const heightOptions = generateHeightOptions();
  const weightOptions = generateWeightOptions();

  // Track changes
  useEffect(() => {
    const changed =
      heightCm !== (initialData.heightCm || 183) ||
      weightKg !== (initialData.weightKg || 100) ||
      consentShareBodyMetrics !== initialData.consentShareBodyMetrics ||
      marketingPushOptIn !== initialData.marketingPushOptIn ||
      marketingEmailOptIn !== initialData.marketingEmailOptIn;
    setHasChanges(changed);
  }, [heightCm, weightKg, consentShareBodyMetrics, marketingPushOptIn, marketingEmailOptIn, initialData]);

  const handleSave = async () => {
    // Clear previous errors
    setConsentError(null);
    setSaveMessage(null);

    // Check if body metrics changed but consent not given
    const bodyMetricsChanged = 
      heightCm !== (initialData.heightCm || 183) ||
      weightKg !== (initialData.weightKg || 100);

    if (bodyMetricsChanged && !consentShareBodyMetrics) {
      setConsentError("Consent is required to save body metrics.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/account/personal-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm,
          weightKg,
          consentShareBodyMetrics,
          marketingPushOptIn,
          marketingEmailOptIn,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save preferences");
      }

      setSaveMessage({ type: "success", text: "Saved successfully" });
      setHasChanges(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("[PersonalDataClient] Save error:", error);
      setSaveMessage({
        type: "error",
        text: "Could not save preferences. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const { feet, inches } = cmToFeetInches(heightCm);

  return (
    <div className="space-y-8">
      {/* Header with Save button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Personal data</h1>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            hasChanges && !isSaving
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div
          className={`p-4 rounded-lg ${
            saveMessage.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* CARD 1: Body Metrics (MUST BE FIRST) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Body metrics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Height Picker */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Height</label>
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-teal-700">
                {feet}&apos;{inches}&quot;
              </div>
              <div className="text-sm text-gray-500 mt-1">{heightCm} cm</div>
            </div>
            <WheelPicker
              options={heightOptions}
              value={heightCm}
              onChange={setHeightCm}
              className="border border-gray-200 rounded-lg"
            />
          </div>

          {/* Weight Picker */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Weight</label>
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-teal-700">{weightKg} kg</div>
              <div className="text-sm text-gray-500 mt-1">{Math.round(weightKg * 2.20462)} lbs</div>
            </div>
            <WheelPicker
              options={weightOptions}
              value={weightKg}
              onChange={setWeightKg}
              className="border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Body metrics consent checkbox */}
        <div className="pt-4 border-t border-gray-200">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={consentShareBodyMetrics}
                onChange={(e) => {
                  setConsentShareBodyMetrics(e.target.checked);
                  setConsentError(null); // Clear error when toggled
                }}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                I consent to share my height and weight data with InstaHealth for personalised recommendations
              </div>
            </div>
          </label>
          
          {/* Consent error message */}
          {consentError && (
            <div className="mt-2 text-sm text-red-600 font-medium">
              {consentError}
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: Marketing Preferences (MUST BE SECOND) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Marketing preferences</h2>
        
        <div className="space-y-4">
          {/* Push notifications consent */}
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={marketingPushOptIn}
                onChange={(e) => setMarketingPushOptIn(e.target.checked)}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                I consent to receive push notifications to my device, of advertising or other marketing material from InstaHealth
              </div>
            </div>
          </label>

          {/* Email consent */}
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={marketingEmailOptIn}
                onChange={(e) => setMarketingEmailOptIn(e.target.checked)}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                I consent to receive emails to my device, of advertising or other marketing material from InstaHealth
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
