"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { useLocationStore } from "@/lib/store/location-store";
import { LocationDialog } from "@/components/location/LocationDialog";
import { cn } from "@/lib/utils";

export function LocationStrip() {
  const { address, isSelected } = useLocationStore();
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
        }
      } catch (error) {
        console.error("Failed to load locations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, []);

  return (
    <div className="w-full bg-white border-t border-[#E5E7EB] h-14">
      <div className="container mx-auto max-w-[1200px] px-6 h-full flex items-center">
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-colors duration-200",
            isSelected && address
              ? "text-gray-900 hover:text-gray-700"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <MapPin className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="leading-tight">
              {isSelected && address ? address.city : "Select your location"}
            </span>
            <span className="text-xs text-gray-500 leading-tight">
              See available products and services in your area
            </span>
          </div>
        </button>
        <LocationDialog 
          open={open} 
          onOpenChange={setOpen}
          locations={locations}
          onSelect={(location) => {
            // Handle location selection
            setOpen(false);
          }}
          isSaving={isLoading}
        />
      </div>
    </div>
  );
}
