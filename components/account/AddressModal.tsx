"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loadGoogleMaps } from "@/lib/googleMaps";

// Type declaration for google namespace (loaded at runtime)
declare global {
  var google: any;
}

interface AddressData {
  id?: string;
  label: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  area?: string | null;
  city?: string | null;
  emirate?: string | null;
  instructions?: string | null;
  lat: number;
  lng: number;
  placeId: string;
  formattedAddress: string;
  isDefault: boolean;
}

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: Omit<AddressData, "id">) => Promise<void>;
  editingAddress?: AddressData | null;
}

type ModalMode = "search" | "map" | "form";

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  rawSuggestion?: any; // Store raw suggestion for debugging
}

const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

// Helper to extract display label from suggestion (new API or legacy)
function getSuggestionLabel(s: any): { main: string; secondary: string } {
  // Priority 1: New API structured format
  if (s?.placePrediction?.structuredFormat) {
    const mainText = s.placePrediction.structuredFormat.mainText?.text || "";
    const secondaryText = s.placePrediction.structuredFormat.secondaryText?.text || "";
    if (mainText) {
      return { main: mainText, secondary: secondaryText };
    }
  }
  
  // Priority 2: New API text field (full text)
  if (s?.placePrediction?.text?.text) {
    const fullText = s.placePrediction.text.text;
    // Try to split on comma for main/secondary
    const parts = fullText.split(", ");
    if (parts.length > 1) {
      return { main: parts[0], secondary: parts.slice(1).join(", ") };
    }
    return { main: fullText, secondary: "" };
  }
  
  // Priority 3: Legacy API format
  if (s?.description) {
    const parts = s.description.split(", ");
    if (parts.length > 1) {
      return { main: parts[0], secondary: parts.slice(1).join(", ") };
    }
    return { main: s.description, secondary: "" };
  }
  
  // Priority 4: Legacy structured formatting
  if (s?.structured_formatting) {
    return {
      main: s.structured_formatting.main_text || "",
      secondary: s.structured_formatting.secondary_text || "",
    };
  }
  
  // Fallback
  const fallback = s?.placePrediction?.placeId || s?.place_id || "Unknown place";
  if (process.env.NODE_ENV === "development" && !s?.placePrediction?.text) {
    console.log("[AddressModal] Suggestion missing expected text fields:", s);
  }
  return { main: fallback, secondary: "" };
}

export function AddressModal({ isOpen, onClose, onSave, editingAddress }: AddressModalProps) {
  const [mode, setMode] = useState<ModalMode>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Map state (use any to avoid google namespace issues at build time)
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    formattedAddress: string;
    placeId: string;
    city?: string;
    area?: string;
    emirate?: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<AddressData, "id">>({
    label: "",
    phone: "",
    line1: "",
    line2: "",
    area: "",
    city: "",
    emirate: "Dubai",
    instructions: "",
    lat: 0,
    lng: 0,
    placeId: "",
    formattedAddress: "",
    isDefault: false,
  });

  // Load editing data
  useEffect(() => {
    if (editingAddress && isOpen) {
      setFormData({
        label: editingAddress.label,
        phone: editingAddress.phone || "",
        line1: editingAddress.line1,
        line2: editingAddress.line2 || "",
        area: editingAddress.area || "",
        city: editingAddress.city || "",
        emirate: editingAddress.emirate || "Dubai",
        instructions: editingAddress.instructions || "",
        lat: editingAddress.lat,
        lng: editingAddress.lng,
        placeId: editingAddress.placeId,
        formattedAddress: editingAddress.formattedAddress,
        isDefault: editingAddress.isDefault,
      });
      setMode("form");
    } else if (isOpen) {
      // Reset for new address
      setMode("search");
      setSearchQuery("");
      setPredictions([]);
      setSelectedLocation(null);
      setFormData({
        label: "",
        phone: "",
        line1: "",
        line2: "",
        area: "",
        city: "",
        emirate: "Dubai",
        instructions: "",
        lat: 0,
        lng: 0,
        placeId: "",
        formattedAddress: "",
        isDefault: false,
      });
    }
  }, [editingAddress, isOpen]);

  // Debounced search (using new Places Autocomplete API)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3 || mode !== "search") {
      setPredictions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        await loadGoogleMaps();
        
        // Use new AutocompleteSuggestion API
        const request = {
          input: searchQuery,
          includedRegionCodes: ["AE"],
          language: "en",
        };

        const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        
        if (suggestions && suggestions.length > 0) {
          setPredictions(
            suggestions.map((suggestion: any) => {
              const { main, secondary } = getSuggestionLabel(suggestion);
              return {
                placeId: suggestion.placePrediction?.placeId || "",
                description: suggestion.placePrediction?.text?.text || main,
                mainText: main,
                secondaryText: secondary,
                rawSuggestion: suggestion,
              };
            })
          );
        } else {
          setPredictions([]);
        }
        setIsSearching(false);
      } catch (err: any) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Search] Autocomplete fetch failed:", {
            name: err?.name,
            code: err?.code,
            message: err?.message,
          });
        }
        setError("Address search temporarily unavailable. You can still set location on map.");
        setPredictions([]);
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  // Initialize map
  const initializeMap = useCallback(async (lat: number, lng: number) => {
    if (!mapRef.current) return;

    try {
      await loadGoogleMaps();

      const map = new google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        draggable: true,
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Handle marker drag
      marker.addListener("dragend", async () => {
        const position = marker.getPosition();
        if (position) {
          const newLat = position.lat();
          const newLng = position.lng();
          await reverseGeocode(newLat, newLng);
        }
      });

      // Initial reverse geocode
      await reverseGeocode(lat, lng);
    } catch (err) {
      console.error("[Map] Error:", err);
      setError("Failed to load map");
    }
  }, []);

  // Reverse geocode function
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === "OK" && results && results[0]) {
          const result = results[0];
          
          let city: string | undefined;
          let area: string | undefined;
          let emirate: string | undefined;

          result.address_components?.forEach((component: any) => {
            if (component.types.includes("locality")) {
              city = component.long_name;
            }
            if (component.types.includes("sublocality") || component.types.includes("neighborhood")) {
              area = component.long_name;
            }
            if (component.types.includes("administrative_area_level_1")) {
              emirate = component.long_name;
            }
          });

          setSelectedLocation({
            lat,
            lng,
            formattedAddress: result.formatted_address,
            placeId: result.place_id,
            city,
            area,
            emirate,
          });
        }
      });
    } catch (err) {
      console.error("[ReverseGeocode] Error:", err);
    }
  };

  // Handle prediction selection (using new Places API)
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setIsLoading(true);
    setError(null);

    try {
      await loadGoogleMaps();
      
      // Use new Place API to fetch place details
      const { Place } = await google.maps.importLibrary("places") as any;
      
      const place = new Place({
        id: prediction.placeId,
      });

      // Fetch fields we need
      await place.fetchFields({
        fields: ["location", "formattedAddress", "addressComponents"],
      });

      if (place.location) {
        const lat = place.location.lat();
        const lng = place.location.lng();

        let city: string | undefined;
        let area: string | undefined;
        let emirate: string | undefined;

        // Parse address components
        if (place.addressComponents) {
          place.addressComponents.forEach((component: any) => {
            const types = component.types || [];
            if (types.includes("locality")) {
              city = component.longText;
            }
            if (types.includes("sublocality") || types.includes("neighborhood")) {
              area = component.longText;
            }
            if (types.includes("administrative_area_level_1")) {
              emirate = component.longText;
            }
          });
        }

        setSelectedLocation({
          lat,
          lng,
          formattedAddress: place.formattedAddress || prediction.description,
          placeId: prediction.placeId,
          city,
          area,
          emirate,
        });

        setMode("map");
        setIsLoading(false);

        // Initialize map in next tick
        setTimeout(() => {
          initializeMap(lat, lng);
        }, 100);
      } else {
        setError("Failed to get place location");
        setIsLoading(false);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("[SelectPrediction] Place fetch failed:", {
          name: err?.name,
          code: err?.code,
          message: err?.message,
        });
      }
      setError("Failed to select location. Please try setting location on map.");
      setIsLoading(false);
    }
  };

  // Use current location
  const handleUseCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setMode("map");
        setIsLoading(false);

        setTimeout(() => {
          initializeMap(lat, lng);
        }, 100);
      },
      (err) => {
        console.error("[Geolocation] Error:", err);
        setError("Could not get your location");
        setIsLoading(false);
      },
      {
        timeout: 10000,
        enableHighAccuracy: true,
      }
    );
  };

  // Confirm map location
  const handleConfirmLocation = () => {
    if (!selectedLocation) return;

    setFormData((prev) => ({
      ...prev,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      placeId: selectedLocation.placeId,
      formattedAddress: selectedLocation.formattedAddress,
      city: selectedLocation.city || prev.city,
      area: selectedLocation.area || prev.area,
      emirate: selectedLocation.emirate || prev.emirate,
    }));

    setMode("form");
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!formData.label.trim()) {
      setError("Please enter a label (e.g., Home, Work)");
      return;
    }
    if (!formData.line1.trim()) {
      setError("Please enter apartment/villa and building");
      return;
    }
    if (!formData.city?.trim()) {
      setError("Please enter a city");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save address");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold">
            {editingAddress ? "Edit Address" : "Add Delivery Address"}
          </h2>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-64px)] overflow-y-auto">
        {error && (
          <div className="m-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* SEARCH MODE */}
        {mode === "search" && (
          <div className="p-4 space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for your address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-6 text-base"
                autoFocus
              />
            </div>

            {/* Results */}
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              </div>
            )}

            {predictions.length > 0 && (
              <div className="space-y-2">
                {predictions.map((prediction, index) => (
                  <button
                    key={prediction.placeId || `suggestion-${index}`}
                    onClick={() => handleSelectPrediction(prediction)}
                    className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {prediction.mainText || prediction.description || "Unknown location"}
                        </div>
                        {prediction.secondaryText && (
                          <div className="text-sm text-gray-500">{prediction.secondaryText}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div className="space-y-2 pt-4">
              <button
                onClick={() => {
                  setMode("map");
                  setTimeout(() => {
                    initializeMap(25.2048, 55.2708); // Dubai center
                  }, 100);
                }}
                className="w-full p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <MapPin className="w-5 h-5 text-teal-600" />
                <span className="font-medium">Set location on map</span>
              </button>

              <button
                onClick={handleUseCurrentLocation}
                disabled={isLoading}
                className="w-full p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <Navigation className="w-5 h-5 text-teal-600" />
                <span className="font-medium">
                  {isLoading ? "Getting location..." : "Use current location"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* MAP MODE */}
        {mode === "map" && (
          <div className="relative h-full">
            <div ref={mapRef} className="absolute inset-0" />

            {/* Bottom sheet */}
            {selectedLocation && (
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4">
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {selectedLocation.formattedAddress}
                    </div>
                    {selectedLocation.area && (
                      <div className="text-sm text-gray-500">{selectedLocation.area}</div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleConfirmLocation}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6"
                >
                  CONFIRM LOCATION
                </Button>
              </div>
            )}
          </div>
        )}

        {/* FORM MODE */}
        {mode === "form" && (
          <div className="p-4 space-y-6 pb-24">
            {/* Selected location display */}
            {formData.formattedAddress && (
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-teal-900">Selected Location</div>
                    <div className="text-sm text-teal-700">{formData.formattedAddress}</div>
                  </div>
                  <button
                    onClick={() => setMode("map")}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="label" className="block text-sm font-medium text-gray-900 mb-1">Label *</label>
                <Input
                  id="label"
                  placeholder="e.g., Home, Work"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">Contact Phone</label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+971 50 XXX XXXX"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="line1" className="block text-sm font-medium text-gray-900 mb-1">Apartment/Villa & Building *</label>
                <Input
                  id="line1"
                  placeholder="Apt 123, Building Name"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="line2" className="block text-sm font-medium text-gray-900 mb-1">Street / Additional Info</label>
                <Input
                  id="line2"
                  placeholder="Street name or additional details"
                  value={formData.line2 || ""}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="area" className="block text-sm font-medium text-gray-900 mb-1">Area / Community</label>
                  <Input
                    id="area"
                    placeholder="e.g., Downtown"
                    value={formData.area || ""}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-1">City *</label>
                  <Input
                    id="city"
                    placeholder="e.g., Dubai"
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="emirate" className="block text-sm font-medium text-gray-900 mb-1">Emirate</label>
                <select
                  id="emirate"
                  value={formData.emirate || "Dubai"}
                  onChange={(e) => setFormData({ ...formData, emirate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {UAE_EMIRATES.map((emirate) => (
                    <option key={emirate} value={emirate}>
                      {emirate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-900 mb-1">Delivery Instructions</label>
                <Textarea
                  id="instructions"
                  placeholder="e.g., Ring doorbell, leave at reception"
                  rows={3}
                  value={formData.instructions || ""}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Set as default address
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom save button (form mode only) */}
      {mode === "form" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "SAVE ADDRESS"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
