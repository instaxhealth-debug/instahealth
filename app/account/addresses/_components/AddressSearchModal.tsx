"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, MapPin } from "lucide-react";
import { loadGoogleMaps, getPlacesLibrary } from "@/lib/googleMaps";

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText?: string;
}

interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrediction: (prediction: {
    placeId: string;
    formattedAddress: string;
    lat: number;
    lng: number;
  }) => void;
}

export function AddressSearchModal({
  isOpen,
  onClose,
  onSelectPrediction,
}: AddressSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaderError, setLoaderError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<any>(null);

  // Initialize Places API on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    const initPlaces = async () => {
      try {
        setLoaderError(null);
        await loadGoogleMaps();

        if (!isMounted) return;

        const places = await getPlacesLibrary();
        if (!places?.AutocompleteSuggestion) {
          throw new Error("Places API not available");
        }

        // Create a session token for billing optimization
        const placesLib = await getPlacesLibrary();
        if (placesLib.AutocompleteSessionToken) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
      } catch (err: any) {
        if (isMounted) {
          setLoaderError(err.message || "Failed to load Google Maps");
          console.error("[AddressSearch] Init failed:", err);
        }
      }
    };

    initPlaces();
    return () => {
      isMounted = false;
    };
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const places = await getPlacesLibrary();
      if (!places?.AutocompleteSuggestion) {
        throw new Error("Places library not ready");
      }

      const suggestions =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          componentRestrictions: { country: "ae" },
          types: ["address"],
          sessionToken: sessionTokenRef.current,
        });

      if (suggestions?.suggestions) {
        setSuggestions(
          suggestions.suggestions.map((s: any) => ({
            placeId: s.placePrediction?.placeId || "",
            mainText:
              s.placePrediction?.mainText?.text ||
              s.placePrediction?.text ||
              "",
            secondaryText:
              s.placePrediction?.secondaryText?.text || undefined,
          }))
        );
      } else {
        setSuggestions([]);
      }
    } catch (err: any) {
      console.error("[AddressSearch] Fetch failed:", err);
      setError(err.message || "Failed to fetch suggestions");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    },
    [fetchSuggestions]
  );

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/geo/resolve-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: suggestion.placeId }),
      });

      if (!response.ok) {
        throw new Error("Failed to resolve place");
      }

      const data = await response.json();
      onSelectPrediction({
        placeId: suggestion.placeId,
        formattedAddress: suggestion.mainText,
        lat: data.lat,
        lng: data.lng,
      });

      onClose();
    } catch (err: any) {
      setError("Failed to select address");
      console.error("[AddressSearch] Select failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - centered on desktop, bottom sheet on mobile */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-full h-1/2 md:h-auto md:w-full md:max-w-2xl bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-6 py-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">
              Search your location
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search Input */}
          <div className="px-4 md:px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search for a place"
                className="flex-1 outline-none bg-transparent text-sm md:text-base"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Suggestions List */}
          <div className="flex-1 overflow-y-auto">
            {loaderError && (
              <div className="px-4 py-3 text-center text-sm text-red-600">
                {loaderError}
              </div>
            )}

            {error && !loaderError && (
              <div className="px-4 py-3 text-center text-sm text-yellow-700">
                {error}
              </div>
            )}

            {isLoading && !suggestions.length && (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoading &&
              !loaderError &&
              suggestions.length === 0 &&
              searchQuery.trim() && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-500">No results</p>
                </div>
              )}

            {suggestions.length > 0 && (
              <ul className="divide-y divide-gray-200">
                {suggestions.map((sugg, idx) => (
                  <li key={`${sugg.placeId}-${idx}`}>
                    <button
                      onClick={() => handleSelectSuggestion(sugg)}
                      disabled={isLoading}
                      className="w-full text-left px-4 md:px-6 py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex gap-3"
                    >
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm md:text-base truncate">
                          {sugg.mainText}
                        </p>
                        {sugg.secondaryText && (
                          <p className="text-xs md:text-sm text-gray-500 truncate">
                            {sugg.secondaryText}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
