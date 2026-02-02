/**
 * Google Maps Loader (RESET)
 * Single loader using @googlemaps/js-api-loader
 * Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (browser-restricted key)
 * Logs origin + key suffix for runtime proof
 */

import { Loader } from "@googlemaps/js-api-loader";

let loaderPromise: Promise<typeof google> | null = null;
let loadError: Error | null = null;

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function getKeySuffix(): string {
  if (!API_KEY) return "MISSING";
  return API_KEY.slice(-6);
}

function getOrigin(): string {
  if (typeof window === "undefined") return "SSR";
  return window.location.origin;
}

export async function loadGoogleMaps(): Promise<typeof google> {
  // If already loaded, return cached instance
  if (loaderPromise) {
    return loaderPromise;
  }

  // If previous load failed, throw cached error
  if (loadError) {
    throw loadError;
  }

  if (!API_KEY) {
    const error = new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set");
    loadError = error;
    throw error;
  }

  loaderPromise = (async () => {
    try {
      const origin = getOrigin();
      const keySuffix = getKeySuffix();

      console.log(
        `[GoogleMaps] Loading (origin: ${origin}, key suffix: ...${keySuffix})`
      );

      const loader = new Loader({
        apiKey: API_KEY,
        version: "weekly",
        libraries: ["places"],
      });

      const loadPromise = loader.load();
      const timeoutPromise = new Promise<typeof google>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Google Maps load timeout (10s) - check API key, billing, referrer restrictions"
              )
            ),
          10000
        );
      });

      await Promise.race([loadPromise, timeoutPromise]);

      if (!window.google?.maps) {
        throw new Error("Maps library missing after load");
      }

      console.log(
        `[GoogleMaps] ✓ Loaded (origin: ${origin}, key: ...${keySuffix})`
      );
      return window.google;
    } catch (error: any) {
      loadError = error;
      const origin = getOrigin();
      const keySuffix = getKeySuffix();
      console.error(
        `[GoogleMaps] ✗ Load failed (origin: ${origin}, key: ...${keySuffix}):`,
        error.message
      );
      throw error;
    }
  })();

  return loaderPromise;
}

export async function getPlacesLibrary(): Promise<any> {
  const google = await loadGoogleMaps();
  return (google.maps as any).importLibrary("places");
}

export function resetLoader() {
  loaderPromise = null;
  loadError = null;
}

