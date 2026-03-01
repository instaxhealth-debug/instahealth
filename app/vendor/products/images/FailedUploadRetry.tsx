"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Upload, Loader2, CheckCircle2 } from "lucide-react";

interface SkuSuggestion {
  sku: string;
  productName: string;
  score: number;
  scorePercent: string;
}

interface FailedUploadRetryProps {
  filename: string;
  derivedSku: string;
  originalError: string;
  suggestions: SkuSuggestion[];
  imageUrl: string;
  replaceExisting: boolean;
  onRetrySuccess: (result: {
    filename: string;
    sku: string;
    imageUrl: string;
  }) => void;
  onDismiss: () => void;
}

export function FailedUploadRetry({
  filename,
  derivedSku,
  originalError,
  suggestions,
  imageUrl,
  replaceExisting,
  onRetrySuccess,
  onDismiss,
}: FailedUploadRetryProps) {
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [manualSku, setManualSku] = useState<string>("");
  const [useManualInput, setUseManualInput] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrySuccess, setRetrySuccess] = useState(false);

  const handleRetry = async () => {
    const skuToUse = useManualInput ? manualSku.trim() : selectedSku;

    if (!skuToUse) {
      setRetryError("Please select or enter a SKU");
      return;
    }

    setIsRetrying(true);
    setRetryError(null);

    try {
      const response = await fetch("/api/vendor/products/images/update-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: skuToUse,
          imageUrl,
          replaceExisting,
          filename,
          allowFuzzyMatch: false, // Explicit SKU provided, no fuzzy matching
        }),
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setRetrySuccess(true);
      onRetrySuccess({
        filename,
        sku: data.sku,
        imageUrl: data.imageUrl,
      });

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        onDismiss();
      }, 2000);
    } catch (error) {
      console.error("[RETRY] Error:", error);
      setRetryError(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setIsRetrying(false);
    }
  };

  if (retrySuccess) {
    return (
      <div className="p-4 rounded-md border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="font-medium text-sm text-green-900 dark:text-green-100">
              Upload successful!
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              {filename} → SKU: {selectedSku || manualSku}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
      <div className="flex items-start gap-2 mb-3">
        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="font-medium text-sm text-orange-900 dark:text-orange-100">
            {filename}
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-300">
            Derived SKU: <span className="font-mono">{derivedSku}</span>
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">{originalError}</p>
        </div>
      </div>

      <div className="space-y-3 ml-7">
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Select matching product:</Label>
            <select
              value={selectedSku}
              onChange={(e) => {
                setSelectedSku(e.target.value);
                setUseManualInput(false);
                setRetryError(null);
              }}
              disabled={useManualInput || isRetrying}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Choose a suggested SKU...</option>
              {suggestions.map((suggestion) => (
                <option key={suggestion.sku} value={suggestion.sku}>
                  {suggestion.sku} - {suggestion.productName} ({suggestion.scorePercent})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 border-t" />
          <span>or</span>
          <div className="flex-1 border-t" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Enter SKU manually:</Label>
          <Input
            type="text"
            placeholder="e.g., ABC-123"
            value={manualSku}
            onChange={(e) => {
              setManualSku(e.target.value);
              setUseManualInput(e.target.value.trim().length > 0);
              setSelectedSku("");
              setRetryError(null);
            }}
            disabled={isRetrying}
            className="h-8 text-xs font-mono"
          />
        </div>

        {retryError && (
          <p className="text-xs text-red-600 dark:text-red-400">{retryError}</p>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleRetry}
            disabled={isRetrying || (!selectedSku && !manualSku.trim())}
            size="sm"
            className="flex-1"
          >
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-3 w-3" />
                Apply & Upload
              </>
            )}
          </Button>
          <Button onClick={onDismiss} variant="ghost" size="sm" disabled={isRetrying}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
