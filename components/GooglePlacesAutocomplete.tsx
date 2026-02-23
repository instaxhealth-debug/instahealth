"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface PlaceResult {
  id?: string;
  placeId: string;
  formattedAddress: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  postalCode?: string;
  emirate?: string;
  area?: string;
  label?: string;
  line1: string;
  line2?: string;
}

interface GooglePlacesAutocompleteProps {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  defaultValue?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function GooglePlacesAutocomplete({
  onSelect,
  placeholder = "Enter address",
  defaultValue = "",
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    if (typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoading(false);
      document.head.appendChild(script);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && inputRef.current && !autocompleteRef.current && window.google) {
      // Initialize autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "ae" }, // Restrict to UAE
        fields: ["address_components", "formatted_address", "geometry", "place_id"],
      });

      // Add listener for place selection
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();

        if (!place || !place.geometry || !place.geometry.location) {
          return;
        }

        // Extract address components
        const addressComponents = place.address_components || [];
        let city = "";
        let emirate = "";
        let area = "";
        let postalCode = "";

        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes("locality")) {
            city = component.long_name;
          }
          if (types.includes("administrative_area_level_1")) {
            emirate = component.long_name;
          }
          if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
            area = component.long_name;
          }
          if (types.includes("postal_code")) {
            postalCode = component.long_name;
          }
        });

        const result: PlaceResult = {
          placeId: place.place_id || "",
          formattedAddress: place.formatted_address || "",
          address: place.formatted_address || "",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          city,
          country: "United Arab Emirates",
          postalCode,
          emirate,
          area,
          line1: place.formatted_address || "",
          label: "Service Address",
        };

        onSelect(result);
      });
    }
  }, [isLoading, onSelect]);

  if (isLoading) {
    return (
      <div className="relative">
        <Input placeholder={placeholder} disabled />
        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      defaultValue={defaultValue}
    />
  );
}
