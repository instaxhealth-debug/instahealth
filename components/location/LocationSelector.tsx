"use client";

import { useState, useEffect } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocationStore } from "@/lib/store/location-store";
import { LocationDialog } from "./LocationDialog";
import { cn } from "@/lib/utils";

export function LocationSelector() {
  const { address, isSelected } = useLocationStore();
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
        }
      } catch (error) {
        console.error("Failed to load locations:", error);
      }
    };
    fetchLocations();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "gap-2 text-sm h-10 px-4 rounded-full border-gray-900/30 bg-white/80 hover:bg-white text-gray-900 font-medium backdrop-blur-sm",
          !isSelected && "border-red-400/50 text-red-900 bg-red-50/80"
        )}
        onClick={() => setOpen(true)}
      >
        <MapPin className="h-4 w-4" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {isSelected && address ? address.city : "Select location"}
        </span>
        <span className="sm:hidden">
          {isSelected && address ? address.city : "Location"}
        </span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </Button>
      <LocationDialog 
        open={open} 
        onOpenChange={setOpen}
        locations={locations}
        onSelect={() => setOpen(false)}
      />
    </>
  );
}
