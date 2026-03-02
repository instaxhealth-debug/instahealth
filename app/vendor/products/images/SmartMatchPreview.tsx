"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Check, AlertCircle } from "lucide-react";
import type {
  ProductMatchResult,
  VendorProduct,
} from "@/lib/matching/product-image-matcher";

interface SmartMatchPreviewProps {
  matchResults: ProductMatchResult[];
  allProducts: VendorProduct[];
  onMatchUpdate: (filename: string, selectedProduct: VendorProduct) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SmartMatchPreview({
  matchResults,
  allProducts,
  onMatchUpdate,
  onConfirm,
  onCancel,
}: SmartMatchPreviewProps) {
  const [searchTerms, setSearchTerms] = useState<Map<string, string>>(new Map());
  const [selectedProducts, setSelectedProducts] = useState<Map<string, VendorProduct>>(
    new Map(
      matchResults
        .filter((r) => r.suggestedProduct)
        .map((r) => [r.filename, r.suggestedProduct!])
    )
  );

  const handleProductSelect = (filename: string, product: VendorProduct) => {
    setSelectedProducts((prev) => new Map(prev).set(filename, product));
    onMatchUpdate(filename, product);
  };

  const handleSearchChange = (filename: string, term: string) => {
    setSearchTerms((prev) => new Map(prev).set(filename, term));
  };

  const getFilteredProducts = (filename: string): VendorProduct[] => {
    const term = searchTerms.get(filename)?.toLowerCase() || "";
    if (!term) return allProducts.slice(0, 10); // Show first 10 if no search

    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.slug?.toLowerCase().includes(term)
    );
  };

  const allResolved = matchResults.every((r) => selectedProducts.has(r.filename));

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
            {selectedProducts.size}/{matchResults.length} resolved
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
              {matchResults.map((result) => {
                const selectedProduct = selectedProducts.get(result.filename);
                const isAutoAccepted = result.autoAccept;

                return (
                  <tr key={result.filename} className="border-t hover:bg-muted/50">
                    {/* Filename */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {result.filename}
                        </span>
                        {isAutoAccepted && (
                          <Badge variant="outline" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Key: {result.candidateKey}
                      </span>
                    </td>

                    {/* Suggested Match Dropdown */}
                    <td className="p-3">
                      <select
                        value={selectedProduct?.id || ""}
                        onChange={(e) => {
                          const product = allProducts.find((p) => p.id === e.target.value);
                          if (product) {
                            handleProductSelect(result.filename, product);
                          }
                        }}
                        className="w-full text-sm border rounded-md p-2 bg-background"
                      >
                        {!selectedProduct && (
                          <option value="">Select a product...</option>
                        )}
                        {result.topCandidates.map((candidate) => (
                          <option key={candidate.product.id} value={candidate.product.id}>
                            {candidate.product.name} ({candidate.product.sku}) -{" "}
                            {(candidate.score * 100).toFixed(0)}%
                          </option>
                        ))}
                      </select>
                      {selectedProduct && (
                        <div className="text-xs text-muted-foreground mt-1">
                          SKU: {selectedProduct.sku}
                        </div>
                      )}
                    </td>

                    {/* Confidence Badge */}
                    <td className="p-3">{getConfidenceBadge(result.confidence)}</td>

                    {/* Score */}
                    <td className="p-3">
                      <span className="text-sm font-mono">
                        {(result.score * 100).toFixed(0)}%
                      </span>
                    </td>

                    {/* Manual Override Search */}
                    <td className="p-3">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={searchTerms.get(result.filename) || ""}
                          onChange={(e) =>
                            handleSearchChange(result.filename, e.target.value)
                          }
                          className="pl-8 text-sm h-9"
                        />
                        {searchTerms.get(result.filename) && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {getFilteredProducts(result.filename).map((product) => (
                              <button
                                key={product.id}
                                onClick={() => {
                                  handleProductSelect(result.filename, product);
                                  handleSearchChange(result.filename, "");
                                }}
                                className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-b-0"
                              >
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  SKU: {product.sku}
                                </div>
                              </button>
                            ))}
                            {getFilteredProducts(result.filename).length === 0 && (
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
