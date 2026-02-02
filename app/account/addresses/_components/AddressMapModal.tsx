"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";

declare global {
  namespace google {
    namespace maps {
      class Map {
        constructor(element: Element, options?: any);
        getCenter(): LatLng | undefined;
        addListener(eventName: string, callback: Function): void;
      }
      class Marker {
        constructor(options?: any);
        setPosition(latLng: LatLng | LatLngLiteral): void;
      }
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      class LatLng {
        lat(): number;
        lng(): number;
      }
      namespace places {
        interface PlacesServiceStatus {
          OK: string;
          ZERO_RESULTS: string;
          REQUEST_DENIED: string;
          INVALID_REQUEST: string;
          OVER_QUERY_LIMIT: string;
          UNKNOWN_ERROR: string;
        }
      }
    }
  }
}

interface AddressMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    formattedAddress: string;
    lat: number;
    lng: number;
  }) => void;
}

export function AddressMapModal({ isOpen, onClose, onConfirm }: AddressMapModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 25.2048, lng: 55.2708 }); // Dubai center
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen || !mapContainer.current || map.current) return;

    let isMounted = true;

    const waitForNonZeroRect = async (element: HTMLElement, maxWaitMs = 1200) => {
      const start = performance.now();
      while (performance.now() - start < maxWaitMs) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return rect;
        await new Promise(requestAnimationFrame);
      }
      return element.getBoundingClientRect();
    };

    const initMap = async () => {
      try {
        setMapError(null);
        setMapLoaded(false);

        await loadGoogleMaps();

        if (!isMounted || !mapContainer.current) return;

        // Wait for container to have non-zero size (modal must be visible)
        const rect = await waitForNonZeroRect(mapContainer.current, 1200);
        if (rect.width === 0 || rect.height === 0) {
          throw new Error("Map container not visible - modal may not be open");
        }

        if (!window.google?.maps?.Map) {
          throw new Error("Maps API not loaded");
        }

        map.current = new window.google.maps.Map(mapContainer.current, {
          zoom: 14,
          center: mapCenter,
          disableDefaultUI: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
        });

        marker.current = new window.google.maps.Marker({
          map: map.current,
          position: mapCenter,
          draggable: false,
          title: "Selected Location",
        });

        map.current.addListener("center_changed", () => {
          const newCenter = map.current!.getCenter();
          if (newCenter) {
            const lat = newCenter.lat();
            const lng = newCenter.lng();
            setMapCenter({ lat, lng });
            marker.current!.setPosition(newCenter);
          }
        });

        // Trigger resize to ensure tiles render
        setTimeout(() => {
          window.google.maps.event.trigger(map.current, "resize");
        }, 50);

        setMapLoaded(true);
      } catch (err: any) {
        if (isMounted) {
          setMapError(err.message || "Failed to load map");
          console.error("[MapModal] Init error:", err);
        }
      }
    };

    initMap();

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
      isMounted = false;
    };
  }, [isOpen, mapCenter]);

  const handleConfirm = useCallback(async () => {
    try {
      setIsLoadingAddress(true);
      setError(null);

      const response = await fetch("/api/geo/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: mapCenter.lat,
          lng: mapCenter.lng,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to get address");
      }

      const data = await response.json();

      onConfirm({
        formattedAddress: data.formattedAddress,
        lat: mapCenter.lat,
        lng: mapCenter.lng,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to confirm location");
    } finally {
      setIsLoadingAddress(false);
    }
  }, [mapCenter, onClose, onConfirm]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - centered */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-full h-full md:h-auto md:w-full md:max-w-3xl bg-white rounded-none md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-6 py-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">
              Drop a pin on the map
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative bg-gray-100">
            {mapError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                  <p className="text-sm text-red-700">{mapError}</p>
                </div>
              </div>
            ) : !mapLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}

            <div
              ref={mapContainer}
              className="w-full min-h-[400px] h-[60vh] md:h-[520px]"
              style={{ opacity: mapLoaded ? 1 : 0 }}
            />

            {/* Center Crosshair */}
            {!mapError && mapLoaded && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <MapPin className="w-8 h-8 text-teal-600 drop-shadow-lg" />
              </div>
            )}

            {/* Instructions */}
            {!mapError && mapLoaded && (
              <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-md px-4 py-3 text-sm text-gray-700">
                <p className="font-medium">Drag to move the map</p>
                <p className="text-gray-600 text-xs">Pin marks center location</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-4 md:px-6 py-4 flex gap-3 bg-gray-50">
            {error && !mapError && (
              <p className="text-xs text-red-600 flex-1">{error}</p>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoadingAddress || !!mapError || !mapLoaded}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoadingAddress && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isLoadingAddress ? "Confirming..." : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
