"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LocationOption = {
  id: string;
  name: string;
  slug: string;
};

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: LocationOption[];
  onSelect: (location: LocationOption) => void;
  isSaving?: boolean;
}

export function LocationDialog({ open, onOpenChange, locations, onSelect, isSaving = false }: LocationDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const query = searchQuery.toLowerCase();
    return locations.filter((loc) => loc.name.toLowerCase().includes(query) || loc.slug.toLowerCase().includes(query));
  }, [locations, searchQuery]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 border border-border/50 bg-card p-6 shadow-large duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl">
          <div className="space-y-2">
            <Dialog.Title className="text-xl font-semibold">Select Delivery Location</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Choose a location to see available products and services
            </Dialog.Description>
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-10 h-12 rounded-xl border-border/50"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-border/50 p-2">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((location, idx) => (
                <button
                  key={location.id || idx}
                  onClick={() => onSelect(location)}
                  className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors"
                  disabled={isSaving}
                >
                  <p className="text-sm font-medium">{location.name}</p>
                  <p className="text-xs text-muted-foreground">{location.slug}</p>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No locations found
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-lg opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-1">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
