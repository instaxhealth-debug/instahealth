"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Check, AlertCircle, AlertTriangle } from "lucide-react";
import type { VendorProduct } from "@/lib/matching/product-image-matcher";

interface SmartMatchRow {
  file: File;
  filename: string;
  resolvedProductId: string | null;
  productName: string | null;
  confidence: "exact_sku" | "exact_name" | "high" | "medium" | "none";
  score: number;
}

interface SmartMatchPreviewProps {
  smartMatchRows: SmartMatchRow[];
  allProducts: VendorProduct[];
  onMatchUpdate: (filename: string, productId: string) => void;  // Now passes product ID
  onConfirm: () => void;
  onCancel: () => void;
}

export function SmartMatchPreview({
  smartMatchRows,
  allProducts,
  onMatchUpdate,
  onConfirm,
  onCancel,
}: SmartMatchPreviewProps) {
  const [searchTerms, setSearchTerms] = useState<Map<string, string>>(new Map());
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const [confirmedLowConfidence, setConfirmedLowConfidence] = useState<Set<string>>(new Set());

  const handleProductSelect = (filename: string, productId: string) => {
    onMatchUpdate(filename, productId);
  };

  const handleSearchChange = (filename: string, term: string) => {
    setSearchTerms((prev) => new Map(prev).set(filename, term));
  };

  const getFilteredProducts = (filename: string): VendorProduct[] => {
    const term = searchTerms.get(filename)?.toLowerCase() || "";
    if (!term) return allProducts.slice(0, 10); // Show first 10 if no search

    return allProducts.filter(
      (p) => {
        const nameLower = (p.name ?? "").toLowerCase();
        const skuLower = (p.sku ?? "").toLowerCase();
        const slugLower = (p.slug ?? "").toLowerCase();

        return (
          nameLower.includes(term) ||
          skuLower.includes(term) ||
          slugLower.includes(term)
        );
      }
    );
  };

  // ✅ Resolved if productId exists (SKU is optional for display only)
  const allResolved = useMemo(
    () => smartMatchRows.every((row) => row.resolvedProductId),
    [smartMatchRows]
  );

  const resolvedCount = useMemo(
    () => smartMatchRows.filter((row) => row.resolvedProductId).length,
    [smartMatchRows]
  );

  const getConfidenceBadge = (confidence: "exact_sku" | "exact_name" | "high" | "medium" | "none") => {
    switch (confidence) {
      case "exact_sku":
      case "exact_name":
        return <Badge className="bg-green-600">Exact Match</Badge>;
      case "high":
        return <Badge className="bg-green-600">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600">Medium</Badge>;
      default:
        return <Badge variant="destructive">None</Badge>;
    }
  };

  // Get top 3 matching products for each row based on normalized name/sku matching
  // RANKING RULES:
  // 1. Exact name/SKU match > fuzzy match
  // 2. TIE-BREAKER: Products WITH SKU rank higher than products without SKU
  const getTopMatches = (row: SmartMatchRow): VendorProduct[] => {
    const normalized = row.filename.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, "");

    const scored = allProducts.map((p) => {
      // NULL-SAFE normalization
      const skuNorm = (p.sku ?? "").toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
      const nameNorm = (p.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, " ").trim();

      let score = 0;

      // Exact match gets highest score
      if (skuNorm === normalized || nameNorm === normalized) {
        score = 1.0;
      } else {
        // Fuzzy matching
        if (skuNorm && (skuNorm.includes(normalized) || normalized.includes(skuNorm))) {
          score += 0.8;
        }
        if (nameNorm.includes(normalized) || normalized.includes(nameNorm)) {
          score += 0.6;
        }
      }

      // TIE-BREAKER: Add small bonus for products WITH SKU
      // This ensures that if two products have same match score,
      // the one with SKU appears first
      const hasSkuBonus = p.sku ? 0.01 : 0;

      return { product: p, score: score + hasSkuBonus };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.product);
  };

  const handleProceedToConfirmation = () => {
    setShowFinalConfirmation(true);
  };

  const handleBackToPreview = () => {
    setShowFinalConfirmation(false);
  };

  const handleFinalConfirm = () => {
    // Check that all medium-confidence rows have been manually confirmed
    const lowConfidenceRows = smartMatchRows.filter(
      (row) => row.confidence === "medium" || row.confidence === "none"
    );

    const unconfirmedLowConfidence = lowConfidenceRows.filter(
      (row) => !confirmedLowConfidence.has(row.filename)
    );

    if (unconfirmedLowConfidence.length > 0) {
      return; // Don't proceed if low-confidence rows aren't confirmed
    }

    onConfirm();
  };

  const toggleLowConfidenceConfirm = (filename: string) => {
    setConfirmedLowConfidence((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  // Count medium/none confidence rows that need manual confirmation
  const lowConfidenceCount = useMemo(
    () => smartMatchRows.filter((row) => row.confidence === "medium" || row.confidence === "none").length,
    [smartMatchRows]
  );

  // If showing final confirmation screen
  if (showFinalConfirmation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">⚠️ Final Confirmation</h3>
            <p className="text-sm text-muted-foreground">
              Review the exact matches before uploading. Confirm low-confidence matches.
            </p>
          </div>
        </div>

        {/* Final Confirmation Table */}
        <div className="border rounded-md overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Filename</th>
                  <th className="text-left p-3 text-sm font-medium">→</th>
                  <th className="text-left p-3 text-sm font-medium">Product</th>
                  <th className="text-left p-3 text-sm font-medium">SKU</th>
                  <th className="text-left p-3 text-sm font-medium">Product ID</th>
                  <th className="text-left p-3 text-sm font-medium">Confidence</th>
                  <th className="text-left p-3 text-sm font-medium">Confirm</th>
                </tr>
              </thead>
              <tbody>
                {smartMatchRows.map((row) => {
                  const product = allProducts.find((p) => p.id === row.resolvedProductId);
                  const isLowConfidence = row.confidence === "medium" || row.confidence === "none";
                  const isConfirmed = confirmedLowConfidence.has(row.filename);

                  return (
                    <tr
                      key={row.filename}
                      className={`border-t hover:bg-muted/50 ${
                        isLowConfidence && !isConfirmed ? "bg-orange-50 dark:bg-orange-950/20" : ""
                      }`}
                    >
                      <td className="p-3 text-sm font-medium truncate max-w-[150px]">
                        {row.filename}
                      </td>
                      <td className="p-3 text-center text-muted-foreground">→</td>
                      <td className="p-3 text-sm">{product?.name || "Unknown"}</td>
                      <td className="p-3 text-sm font-mono">
                        {product?.sku ? (
                          <span className="text-green-700 dark:text-green-400">{product.sku}</span>
                        ) : (
                          <span className="text-muted-foreground italic">No SKU</span>
                        )}
                      </td>
                      <td className="p-3 text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                        {row.resolvedProductId}
                      </td>
                      <td className="p-3">{getConfidenceBadge(row.confidence)}</td>
                      <td className="p-3">
                        {isLowConfidence ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isConfirmed}
                              onCheckedChange={() => toggleLowConfidenceConfirm(row.filename)}
                            />
                            <span className="text-xs text-orange-600">Required</span>
                          </div>
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning for low-confidence items */}
        {lowConfidenceCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-orange-900 dark:text-orange-100">
                {lowConfidenceCount} low/medium confidence matches require manual confirmation
              </p>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                Please review and check the boxes to confirm these matches are correct.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={handleBackToPreview}>
            ← Back to Preview
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleFinalConfirm}
              disabled={
                lowConfidenceCount > 0 &&
                confirmedLowConfidence.size < lowConfidenceCount
              }
            >
              Confirm & Upload ({smartMatchRows.length} files)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Original preview screen
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Smart Match Preview</h3>
          <p className="text-sm text-muted-foreground">
            Review and confirm product matches before uploading
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allResolved ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-orange-600" />
          )}
          <span className="text-sm">
            {resolvedCount}/{smartMatchRows.length} resolved
          </span>
        </div>
      </div>

      {/* Preview Table */}
      <div className="border rounded-md overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Filename</th>
                <th className="text-left p-3 text-sm font-medium">Suggested Match</th>
                <th className="text-left p-3 text-sm font-medium">Confidence</th>
                <th className="text-left p-3 text-sm font-medium">Score</th>
                <th className="text-left p-3 text-sm font-medium">Manual Override</th>
              </tr>
            </thead>
            <tbody>
              {smartMatchRows.map((row) => {
                const topMatches = getTopMatches(row);
                const selectedProduct = row.resolvedProductId
                  ? allProducts.find((p) => p.id === row.resolvedProductId)
                  : null;
                const isAutoAccepted = row.resolvedProductId !== null && (row.confidence === "exact_sku" || row.confidence === "exact_name");

                return (
                  <tr key={row.filename} className="border-t hover:bg-muted/50">
                    {/* Filename */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {row.filename}
                        </span>
                        {isAutoAccepted && (
                          <Badge variant="outline" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        File: {row.filename}
                      </span>
                    </td>

                    {/* Suggested Match Dropdown */}
                    <td className="p-3">
                      <select
                        value={row.resolvedProductId || ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleProductSelect(row.filename, e.target.value);
                          }
                        }}
                        className="w-full text-sm border rounded-md p-2 bg-background"
                      >
                        {!row.resolvedProductId && (
                          <option value="">Select a product...</option>
                        )}
                        {topMatches.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} {product.sku ? `(${product.sku})` : "(No SKU)"}
                          </option>
                        ))}
                        {topMatches.length === 0 && row.resolvedProductId && (
                          <option value={row.resolvedProductId}>
                            {selectedProduct?.name || "Unknown"}
                          </option>
                        )}
                      </select>
                      {selectedProduct && (
                        <div className="text-xs text-muted-foreground mt-1">
                          SKU: {selectedProduct.sku || <span className="italic">No SKU</span>}
                        </div>
                      )}
                    </td>

                    {/* Confidence Badge */}
                    <td className="p-3">{getConfidenceBadge(row.confidence)}</td>

                    {/* Score */}
                    <td className="p-3">
                      <span className="text-sm font-mono">
                        {(row.score * 100).toFixed(0)}%
                      </span>
                    </td>

                    {/* Manual Override Search */}
                    <td className="p-3">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={searchTerms.get(row.filename) || ""}
                          onChange={(e) =>
                            handleSearchChange(row.filename, e.target.value)
                          }
                          className="pl-8 text-sm h-9"
                        />
                        {searchTerms.get(row.filename) && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {getFilteredProducts(row.filename).map((product) => (
                              <button
                                key={product.id}
                                onClick={() => {
                                  handleProductSelect(row.filename, product.id);
                                  handleSearchChange(row.filename, "");
                                }}
                                className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-b-0"
                              >
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  SKU: {product.sku || <span className="italic">No SKU</span>}
                                </div>
                              </button>
                            ))}
                            {getFilteredProducts(row.filename).length === 0 && (
                              <div className="p-3 text-sm text-muted-foreground text-center">
                                No products found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          {!allResolved && (
            <span className="text-orange-600">
              ⚠ Some files require manual selection
            </span>
          )}
          {allResolved && <span className="text-green-600">✓ All files resolved</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleProceedToConfirmation} disabled={!allResolved}>
            Next: Review Matches →
          </Button>
        </div>
      </div>
    </div>
  );
}
