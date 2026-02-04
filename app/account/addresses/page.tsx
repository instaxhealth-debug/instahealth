"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, AlertCircle, MapPin } from "lucide-react";
import { AddressSearchModal } from "./_components/AddressSearchModal";
import { AddressMapModal } from "./_components/AddressMapModal";
import { MapsDebugPanel } from "@/components/MapsDebugPanel";

type Address = {
  id: string;
  label: string;
  formattedAddress: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

export default function AccountAddressesPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Current form state
  const [label, setLabel] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);

  // Modal states
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const fetchAddresses = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/account/addresses", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch addresses");
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err: any) {
      console.error("[FetchAddresses]", err.message);
      setErrorMsg(err.message || "Failed to fetch addresses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?next=/account/addresses");
      return;
    }

    if (sessionStatus === "authenticated") {
      fetchAddresses();
    }
  }, [sessionStatus, router]);

  const handleSelectPrediction = (prediction: {
    placeId: string;
    formattedAddress: string;
    lat: number;
    lng: number;
  }) => {
    console.log("[SelectPrediction]", prediction.formattedAddress);
    setSelectedAddress(prediction.formattedAddress);
    setSelectedPlaceId(prediction.placeId);
    setSelectedLat(prediction.lat);
    setSelectedLng(prediction.lng);
  };

  const handleConfirmMapLocation = (data: {
    formattedAddress: string;
    lat: number;
    lng: number;
  }) => {
    console.log("[MapConfirm]", data.formattedAddress);
    setSelectedAddress(data.formattedAddress);
    setSelectedPlaceId(null); // Map selection has no placeId
    setSelectedLat(data.lat);
    setSelectedLng(data.lng);
  };

  const handleDelete = async (id: string) => {
    setErrorMsg("");
    try {
      console.log("[Delete] Removing address", id);
      const response = await fetch(`/api/account/addresses/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error || "Failed to delete address";
        console.error("[Delete] Error:", errMsg);
        throw new Error(errMsg);
      }

      console.log("[Delete] Success, refreshing list");
      await fetchAddresses();
    } catch (err: any) {
      const msg = err.message || "Failed to delete address";
      console.error("[Delete] Exception:", msg);
      setErrorMsg(msg);
    }
  };

  const handleSave = async () => {
    if (!label.trim()) {
      setErrorMsg("Please add a label (e.g., Home, Work)");
      return;
    }

    if (selectedLat === null || selectedLng === null) {
      setErrorMsg("Please select a location on the map");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          formattedAddress: selectedAddress || `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`,
          placeId: selectedPlaceId || null,
          latitude: selectedLat,
          longitude: selectedLng,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error || "Failed to save address";
        throw new Error(errMsg);
      }

      setLabel("");
      setSelectedAddress("");
      setSelectedPlaceId(null);
      setSelectedLat(null);
      setSelectedLng(null);
      await fetchAddresses();
    } catch (err: any) {
      const msg = err.message || "Failed to save address";
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Saved Addresses</h1>
          <p className="text-gray-600">Manage delivery addresses for checkout</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/my-account/personal-details">Back to account</Link>
        </Button>
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Address Card */}
        <Card>
          <CardHeader>
            <CardTitle>Add Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Label</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Home, Work, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsMapModalOpen(true)}
                  className="px-4 py-3 text-left border-2 border-teal-500 rounded-lg bg-white hover:bg-teal-50 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-teal-600 mb-1" />
                  <p className="text-sm font-medium text-teal-900">Set on map</p>
                </button>
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="px-4 py-3 text-left border border-input rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">Search</p>
                </button>
              </div>
              {selectedAddress && (
                <p className="mt-2 text-sm text-gray-700">{selectedAddress}</p>
              )}
            </div>

            {selectedLat !== null && selectedLng !== null && (
              <div className="rounded-lg bg-teal-50 p-3 text-sm">
                <p className="font-medium text-teal-900">✓ Location selected</p>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving || !selectedLat}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save address"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Your Addresses Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading addresses...
              </div>
            ) : addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved addresses yet. Add one to use during checkout.
              </p>
            ) : (
              addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between rounded-lg border border-border/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{addr.label}</p>
                    <p className="text-xs text-muted-foreground">{addr.formattedAddress}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(addr.id)}
                    aria-label={`Delete ${addr.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddressSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectPrediction={handleSelectPrediction}
      />

      <AddressMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirm={handleConfirmMapLocation}
      />

      <MapsDebugPanel />
    </div>
  );
}
