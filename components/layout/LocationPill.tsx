"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { LocationDialog } from "@/components/location/LocationDialog";

type LocationOption = {
  id: string;
  name: string;
  slug: string;
};

interface LocationPillProps {
  initialLocation: LocationOption | null;
  locations: LocationOption[];
}

export function LocationPill({ initialLocation, locations }: LocationPillProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(initialLocation);
  const [isSaving, setIsSaving] = useState(false);

  const activeLocations = useMemo(() => locations.filter((loc) => !!loc.id), [locations]);

  const handleSelect = async (location: LocationOption) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: location.id }),
      });

      if (!res.ok) {
        throw new Error("Failed to set location");
      }

      setSelectedLocation(location);
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error selecting location", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-[#0F172A] text-xs font-medium transition-colors duration-200 whitespace-nowrap"
        aria-label={selectedLocation?.name || "Set location"}
        disabled={isSaving}
      >
        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="max-w-[120px] truncate">{selectedLocation?.name || "Set location"}</span>
      </button>
      <LocationDialog
        open={open}
        onOpenChange={setOpen}
        locations={activeLocations}
        onSelect={handleSelect}
        isSaving={isSaving}
      />
    </>
  );
}
