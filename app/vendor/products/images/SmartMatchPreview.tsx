"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Check, AlertCircle } from "lucide-react";
import type { VendorProduct } from "@/lib/matching/product-image-matcher";

interface SmartMatchRow {
  file: File;
  filename: string;
  key: string;
  resolvedSku: string | null;
  confidence: "high" | "medium" | "low" | "none";
  score: number;
}

interface SmartMatchPreviewProps {
  smartMatchRows: SmartMatchRow[];
  allProducts: VendorProduct[];
  onMatchUpdate: (filename: string, sku: string) => void;
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

  const handleProductSelect = (filename: string, sku: string) => {
    onMatchUpdate(filename, sku);
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

  const allResolved = useMemo(
    () => smartMatchRows.every((row) => row.resolvedSku !== null),
    [smartMatchRows]
  );

  const resolvedCount = useMemo(
    () => smartMatchRows.filter((row) => row.resolvedSku !== null).length,
    [smartMatchRows]
  );

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <Badge className="bg-green-600">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600">Medium</Badge>;
      case "low":
        return <Badge className="bg-orange-600">Low</Badge>;
      default:
        return <Badge variant="destructive">None</Badge>;
    }
  };

  // Get top 3 matching products for each row based on normalized name/sku matching
  const getTopMatches = (row: SmartMatchRow): VendorProduct[] => {
    const normalized = row.key.toLowerCase();

    const scored = allProducts.map((p) => {
      // NULL-SAFE normalization
      const skuNorm = (p.sku ?? "").toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
      const nameNorm = (p.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, " ").trim();

      let score = 0;
      if (skuNorm.includes(normalized) || normalized.includes(skuNorm)) score += 0.8;
      if (nameNorm.includes(normalized) || normalized.includes(nameNorm)) score += 0.6;
      if (skuNorm === normalized || nameNorm === normalized) score = 1.0;

      return { product: p, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.product);
  };

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
                const selectedProduct = row.resolvedSku
                  ? allProducts.find((p) => p.sku === row.resolvedSku)
                  : null;
                const isAutoAccepted = row.resolvedSku !== null && row.confidence === "high";

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
                        Key: {row.key}
                      </span>
                    </td>

                    {/* Suggested Match Dropdown */}
                    <td className="p-3">
                      <select
                        value={row.resolvedSku || ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleProductSelect(row.filename, e.target.value);
                          }
                        }}
                        className="w-full text-sm border rounded-md p-2 bg-background"
                      >
                        {!row.resolvedSku && (
                          <option value="">Select a product...</option>
                        )}
                        {topMatches.map((product) => (
                          <option key={product.id} value={product.sku}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                        {topMatches.length === 0 && row.resolvedSku && (
                          <option value={row.resolvedSku}>
                            {selectedProduct?.name || row.resolvedSku} ({row.resolvedSku})
                          </option>
                        )}
                      </select>
                      {selectedProduct && (
                        <div className="text-xs text-muted-foreground mt-1">
                          SKU: {selectedProduct.sku}
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
                                  handleProductSelect(row.filename, product.sku);
                                  handleSearchChange(row.filename, "");
                                }}
                                className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-b-0"
                              >
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  SKU: {product.sku}
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
          <Button onClick={onConfirm} disabled={!allResolved}>
            Confirm & Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
