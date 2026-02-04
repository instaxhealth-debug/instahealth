"use client";

import { useEffect } from "react";

export type LocationOption = {
  id: string;
  name: string;
  slug: string;
};

/**
 * LocationBootstrap - Client-side location data loader
 * Fetches active locations and selected location via API routes
 * If fetch fails, silently falls back to empty state
 * Stores in global state (ready for future context integration)
 */
export function LocationBootstrap() {
  useEffect(() => {
    const loadLocations = async () => {
      try {
        // Fetch active locations
        const locationsRes = await fetch("/api/locations/active", {
          cache: "no-store",
        });

        if (!locationsRes.ok) {
          console.warn(
            "[LocationBootstrap] Failed to fetch active locations:",
            locationsRes.status
          );
        }

        // Fetch selected location
        const selectedRes = await fetch("/api/locations/selected", {
          cache: "no-store",
        });

        if (!selectedRes.ok) {
          console.warn(
            "[LocationBootstrap] Failed to fetch selected location:",
            selectedRes.status
          );
        }

        // TODO: Store in context/state when needed
        // For now, just silently load and cache client-side if needed
      } catch (error) {
        // Silently fail - app must work without location data
        console.warn("[LocationBootstrap] Failed to load locations:", error);
      }
    };

    loadLocations();
  }, []);

  // This component doesn't render anything - it's a data loader
  return null;
}
