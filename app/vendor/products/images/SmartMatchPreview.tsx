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
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-2">Exact</Badge>;
      case "high":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2">High</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-2">Medium</Badge>;
      default:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] px-2">None</Badge>;
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
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="bg-card border rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Final Confirmation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Review matches before uploading · {smartMatchRows.length} files total
              </p>
            </div>

            {/* Final Confirmation Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0 backdrop-blur">
                    <tr className="border-b">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Filename</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-8"></th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Product</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">SKU</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Match</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Confirm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {smartMatchRows.map((row) => {
                      const product = allProducts.find((p) => p.id === row.resolvedProductId);
                      const isLowConfidence = row.confidence === "medium" || row.confidence === "none";
                      const isConfirmed = confirmedLowConfidence.has(row.filename);

                      return (
                        <tr
                          key={row.filename}
                          className={`hover:bg-muted/30 transition-colors ${
                            isLowConfidence && !isConfirmed ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium truncate max-w-[180px]">{row.filename}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">→</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">{product?.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                              ID: {row.resolvedProductId}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {product?.sku ? (
                              <span className="text-sm font-mono text-muted-foreground">{product.sku}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No SKU</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{getConfidenceBadge(row.confidence)}</td>
                          <td className="px-4 py-3">
                            {isLowConfidence ? (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isConfirmed}
                                  onCheckedChange={() => toggleLowConfidenceConfirm(row.filename)}
                                />
                                <span className="text-xs text-amber-700 dark:text-amber-400">Required</span>
                              </div>
                            ) : (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
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
              <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-800/40 rounded-lg">
                <div className="rounded-full p-1 bg-amber-100 dark:bg-amber-900/40 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-sm flex-1">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    {lowConfidenceCount} {lowConfidenceCount === 1 ? 'match requires' : 'matches require'} manual confirmation
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1 text-xs">
                    Review and check the boxes to confirm these matches are correct.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={handleBackToPreview} size="lg">
              ← Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} size="lg">
                Cancel
              </Button>
              <Button
                onClick={handleFinalConfirm}
                disabled={
                  lowConfidenceCount > 0 &&
                  confirmedLowConfidence.size < lowConfidenceCount
                }
                size="lg"
              >
                Confirm & Upload · {smartMatchRows.length} files
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original preview screen
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-card border rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Smart Match Preview</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Review and confirm product matches before uploading
              </p>
            </div>
            <div className="flex items-center gap-2">
              {allResolved ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  <span>All resolved</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{resolvedCount}/{smartMatchRows.length} resolved</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0 backdrop-blur">
                  <tr className="border-b">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Filename</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Suggested Match</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Match Quality</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Score</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Manual Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {smartMatchRows.map((row) => {
                    const topMatches = getTopMatches(row);
                    const selectedProduct = row.resolvedProductId
                      ? allProducts.find((p) => p.id === row.resolvedProductId)
                      : null;
                    const isAutoAccepted = row.resolvedProductId !== null && (row.confidence === "exact_sku" || row.confidence === "exact_name");

                    return (
                      <tr key={row.filename} className="hover:bg-muted/30 transition-colors">
                        {/* Filename */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate max-w-[200px]">{row.filename}</p>
                              {isAutoAccepted && (
                                <Badge variant="outline" className="text-[10px] mt-1 bg-blue-50 text-blue-700 border-blue-200">
                                  Auto-matched
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Suggested Match Dropdown */}
                        <td className="px-4 py-3">
                          <select
                            value={row.resolvedProductId || ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleProductSelect(row.filename, e.target.value);
                              }
                            }}
                            className="w-full max-w-xs text-sm border rounded-md px-3 py-2 bg-background hover:bg-muted/50 transition-colors"
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
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              {selectedProduct.sku || <span className="italic not-italic">No SKU</span>}
                            </p>
                          )}
                        </td>

                        {/* Confidence Badge */}
                        <td className="px-4 py-3">{getConfidenceBadge(row.confidence)}</td>

                        {/* Score */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-muted-foreground">
                            {(row.score * 100).toFixed(0)}%
                          </span>
                        </td>

                        {/* Manual Override Search */}
                        <td className="px-4 py-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              placeholder="Search..."
                              value={searchTerms.get(row.filename) || ""}
                              onChange={(e) =>
                                handleSearchChange(row.filename, e.target.value)
                              }
                              className="pl-9 text-sm h-9 max-w-[200px]"
                            />
                            {searchTerms.get(row.filename) && (
                              <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {getFilteredProducts(row.filename).map((product) => (
                                  <button
                                    key={product.id}
                                    onClick={() => {
                                      handleProductSelect(row.filename, product.id);
                                      handleSearchChange(row.filename, "");
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0 transition-colors"
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                      {product.sku || <span className="italic not-italic">No SKU</span>}
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
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {!allResolved && (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span>Some files require manual selection</span>
              </div>
            )}
            {allResolved && (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>All files resolved</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} size="lg">
              Cancel
            </Button>
            <Button onClick={handleProceedToConfirmation} disabled={!allResolved} size="lg">
              Continue to Confirmation →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
