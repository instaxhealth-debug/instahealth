"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SettingsFormProps {
  initialSettings: {
    emailNotificationsEnabled: boolean;
    smsNotificationsEnabled: boolean;
    marketingOptIn: boolean;
    timezone: string;
    language: string;
  };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const saveSettings = async (updates: Partial<typeof settings>) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/account/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (field: keyof typeof settings, value: boolean) => {
    const updates = { [field]: value };
    setSettings({ ...settings, ...updates });
    saveSettings(updates);
  };

  const handleSelect = (field: keyof typeof settings, value: string) => {
    const updates = { [field]: value };
    setSettings({ ...settings, ...updates });
    saveSettings(updates);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your notifications and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* Notifications Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notifications
          </h2>
          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">
                  Receive order updates and important account notifications via
                  email
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.emailNotificationsEnabled}
                onClick={() =>
                  handleToggle(
                    "emailNotificationsEnabled",
                    !settings.emailNotificationsEnabled
                  )
                }
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
                  settings.emailNotificationsEnabled
                    ? "bg-emerald-600"
                    : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.emailNotificationsEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div>
                <p className="font-medium text-gray-900">SMS Notifications</p>
                <p className="text-sm text-gray-600">
                  Receive order updates via text message
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.smsNotificationsEnabled}
                onClick={() =>
                  handleToggle(
                    "smsNotificationsEnabled",
                    !settings.smsNotificationsEnabled
                  )
                }
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
                  settings.smsNotificationsEnabled
                    ? "bg-emerald-600"
                    : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.smsNotificationsEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Marketing Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Marketing
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                Marketing Communications
              </p>
              <p className="text-sm text-gray-600">
                Receive special offers, promotions, and health tips
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.marketingOptIn}
              onClick={() =>
                handleToggle("marketingOptIn", !settings.marketingOptIn)
              }
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${
                settings.marketingOptIn ? "bg-emerald-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.marketingOptIn ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-4">
            {/* Timezone */}
            <div>
              <label
                htmlFor="timezone"
                className="block font-medium text-gray-900 mb-2"
              >
                Timezone
              </label>
              <select
                id="timezone"
                value={settings.timezone}
                onChange={(e) => handleSelect("timezone", e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                <option value="America/New_York">America/New York (EST)</option>
                <option value="America/Los_Angeles">
                  America/Los Angeles (PST)
                </option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label
                htmlFor="language"
                className="block font-medium text-gray-900 mb-2"
              >
                Language
              </label>
              <select
                id="language"
                value={settings.language}
                onChange={(e) => handleSelect("language", e.target.value)}
                disabled={isSaving}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="en">English</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
