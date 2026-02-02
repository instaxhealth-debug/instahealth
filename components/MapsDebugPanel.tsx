"use client";

import { useEffect, useState } from "react";

interface DebugState {
  origin: string;
  mapsLoaded: boolean;
  keySuffix: string;
  lastError: string | null;
}

export function MapsDebugPanel() {
  const [debug, setDebug] = useState<DebugState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only show in development
    if (process.env.NODE_ENV !== "development") return;

    const origin = window.location.origin;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const keySuffix = apiKey ? apiKey.slice(-6) : "MISSING";

    const mapsLoaded = !!window.google?.maps;

    // Try to get last error from console (hacky but useful for debugging)
    let lastError: string | null = null;
    const originalError = console.error;
    let errorCaptured = false;

    const captureError = (...args: any[]) => {
      if (!errorCaptured && args[0]?.toString?.().includes("GoogleMaps")) {
        lastError = args[0]?.toString?.() || args.toString();
        errorCaptured = true;
      }
      originalError(...args);
    };

    console.error = captureError as any;

    setDebug({
      origin,
      mapsLoaded,
      keySuffix,
      lastError,
    });

    return () => {
      console.error = originalError;
    };
  }, []);

  if (!debug || process.env.NODE_ENV !== "development") return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white rounded-lg p-3 text-xs font-mono max-w-xs shadow-lg"
      style={{
        fontSize: "11px",
        lineHeight: "1.4",
      }}
    >
      <div className="font-bold text-teal-400 mb-2">🗺️ Maps Debug</div>
      <div>Origin: {debug.origin}</div>
      <div>Maps loaded: {debug.mapsLoaded ? "✓ YES" : "✗ NO"}</div>
      <div>Key suffix: ...{debug.keySuffix}</div>
      {debug.lastError && (
        <div className="text-red-400 mt-1">Error: {debug.lastError}</div>
      )}
    </div>
  );
}
