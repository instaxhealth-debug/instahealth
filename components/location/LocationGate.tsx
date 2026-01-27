"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocationStore } from "@/lib/store/location-store";
import { LocationDialog } from "./LocationDialog";

export function LocationGate() {
  const { isSelected } = useLocationStore();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
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

  useEffect(() => {
    if (!isSelected && !dismissed) {
      // Show banner after a brief delay
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isSelected, dismissed]);

  if (isSelected || dismissed) {
    return null;
  }

  return (
    <div className="border-b border-border/40 bg-muted/30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 p-1.5 rounded-full bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Select your location</p>
              <p className="text-xs text-muted-foreground">
                See available products and services in your area
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={() => setOpen(true)}
              className="h-8 px-4 text-xs"
            >
              Select Location
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <LocationDialog 
        open={open} 
        onOpenChange={setOpen}
        locations={locations}
        onSelect={() => setOpen(false)}
      />
    </div>
  );
}
