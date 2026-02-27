"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface VendorSettingsFormProps {
  vendor: {
    id: string;
    logoUrl: string | null;
    tagline: string | null;
    bookingUrl: string | null;
    bookingInstructions: string | null;
    serviceRadiusKm: number;
    enforceServiceRadius: boolean;
    allowOutOfRadiusOverride: boolean;
  };
}

export function VendorSettingsForm({ vendor }: VendorSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    logoUrl: vendor.logoUrl || "",
    tagline: vendor.tagline || "",
    bookingUrl: vendor.bookingUrl || "",
    bookingInstructions: vendor.bookingInstructions || "",
    serviceRadiusKm: vendor.serviceRadiusKm,
    enforceServiceRadius: vendor.enforceServiceRadius,
    allowOutOfRadiusOverride: vendor.allowOutOfRadiusOverride,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/vendor/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update settings");
      }

      toast({
        title: "Settings Updated",
        description: "Your vendor settings have been saved",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Editable Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="text"
              value={formData.logoUrl}
              onChange={(e) =>
                setFormData({ ...formData, logoUrl: e.target.value })
              }
              placeholder="https://example.com/logo.png or /logos/vendor-logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Must be a web URL (https://) or relative path (/logos/). Local
              file paths are not allowed.
            </p>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Textarea
              id="tagline"
              value={formData.tagline}
              onChange={(e) =>
                setFormData({ ...formData, tagline: e.target.value })
              }
              placeholder="Brief description of your business"
              rows={3}
            />
          </div>

          {/* Booking URL */}
          <div className="space-y-2">
            <Label htmlFor="bookingUrl">Booking URL (Vendor Default)</Label>
            <Input
              id="bookingUrl"
              type="url"
              value={formData.bookingUrl}
              onChange={(e) =>
                setFormData({ ...formData, bookingUrl: e.target.value })
              }
              placeholder="https://calendly.com/your-link or Acuity/Fresha/Square URL"
            />
            <p className="text-xs text-muted-foreground">
              Default booking link for your services. Supports Calendly, Acuity, Fresha, Square, or any HTTPS URL. Services can override this with their own booking URL.
            </p>
          </div>

          {/* Booking Instructions */}
          <div className="space-y-2">
            <Label htmlFor="bookingInstructions">Booking Instructions (Optional)</Label>
            <Textarea
              id="bookingInstructions"
              value={formData.bookingInstructions}
              onChange={(e) =>
                setFormData({ ...formData, bookingInstructions: e.target.value })
              }
              placeholder="e.g., 'Please have your health records ready' or 'Select morning slots for faster service'"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Instructions shown to customers before they schedule. Use this to prepare customers or provide helpful tips.
            </p>
          </div>

          {/* Service Radius */}
          <div className="space-y-2">
            <Label htmlFor="serviceRadiusKm">
              Service Radius (km): {formData.serviceRadiusKm}
            </Label>
            <Input
              id="serviceRadiusKm"
              type="range"
              min="1"
              max="200"
              value={formData.serviceRadiusKm}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  serviceRadiusKm: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum delivery distance from your base location
            </p>
          </div>

          {/* Enforce Service Radius */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enforceServiceRadius">
                Enforce Service Radius
              </Label>
              <p className="text-xs text-muted-foreground">
                Reject orders outside your service radius
              </p>
            </div>
            <Switch
              id="enforceServiceRadius"
              checked={formData.enforceServiceRadius}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enforceServiceRadius: checked })
              }
            />
          </div>

          {/* Allow Out of Radius Override */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowOutOfRadiusOverride">
                Allow Out-of-Radius Override
              </Label>
              <p className="text-xs text-muted-foreground">
                Allow admins to override radius restrictions
              </p>
            </div>
            <Switch
              id="allowOutOfRadiusOverride"
              checked={formData.allowOutOfRadiusOverride}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  allowOutOfRadiusOverride: checked,
                })
              }
            />
          </div>

          {/* Save Button */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
