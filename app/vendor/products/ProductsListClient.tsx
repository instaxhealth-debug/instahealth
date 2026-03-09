"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { isServiceCategory } from "@/lib/vendor-categories";
import { ProductListActions } from "./ProductListActions";
import { BulkDeleteModal } from "./BulkDeleteModal";
import { PackageX } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  tags: string[];
  updatedAt: Date;
  active: boolean;
  published: boolean;
  inventoryStatus: string;
  inStock: boolean;
  priceFils: number;
  bookingUrl: string | null;
  imageUrl: string | null;
};

const INVENTORY_BADGES: Record<string, string> = {
  in_stock: "bg-green-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

interface ProductsListClientProps {
  products: ProductRow[];
  query: string;
}

export function ProductsListClient({ products, query }: ProductsListClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < products.length;

  return (
    <>
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-blue-900">
              {selectedIds.size} product{selectedIds.size === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDelete(true)}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Product List */}
      {products.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          {query ? (
            <>
              No products found for <strong>&ldquo;{query}&rdquo;</strong>.
              <div className="mt-2">
                <Button variant="link" size="sm" asChild>
                  <Link href="/vendor/products">Clear search</Link>
                </Button>
              </div>
            </>
          ) : (
            "No items found."
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All Header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Select all products"
              ref={(el) => {
                if (el) {
                  (el as any).indeterminate = someSelected;
                }
              }}
            />
            <span className="text-sm font-medium text-muted-foreground">
              {allSelected ? "Deselect all" : "Select all"} ({products.length} product{products.length === 1 ? "" : "s"})
            </span>
          </div>

          {/* Product Rows */}
          {products.map((product, index) => {
            const isService = isServiceCategory(product.category);
            const isSelected = selectedIds.has(product.id);

            return (
              <div
                key={product.id}
                className={`flex gap-4 rounded-lg border p-4 transition-colors ${
                  isSelected ? "border-blue-500 bg-blue-50/50" : "border-border/60"
                }`}
              >
                {/* Row Number */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {product.imageUrl ? (
                      <div className="relative h-20 w-20 rounded-md border border-border overflow-hidden bg-muted">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-md border border-dashed border-border bg-muted flex items-center justify-center">
                        <PackageX className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{product.name}</span>
                            {product.sku && (
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {product.sku}
                              </span>
                            )}
                            <Badge variant="outline">{product.category}</Badge>
                            <Badge variant="outline">{isService ? "Service" : "Product"}</Badge>
                            {product.tags.length > 0 && (
                              <div className="flex gap-1">
                                {product.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {product.tags.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{product.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Updated {formatDistanceToNow(new Date(product.updatedAt), { addSuffix: true })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/vendor/products/${product.id}`}>Manage</Link>
                          </Button>
                          <ProductListActions
                            productId={product.id}
                            productName={product.name}
                          />
                        </div>
                      </div>

                      {isService ? (
                        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <span className="text-muted-foreground">Active</span>
                            <div className="font-medium">{product.active ? "Yes" : "No"}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Booking</span>
                            <div className="font-medium">
                              {product.bookingUrl ? "Connected" : "Not connected"}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price</span>
                            <div className="font-medium">AED {(product.priceFils / 100).toFixed(2)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                          <div>
                            <span className="text-muted-foreground">Published</span>
                            <div className="font-medium">{product.published ? "Yes" : "No"}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Active</span>
                            <div className="font-medium">{product.active ? "Yes" : "No"}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Inventory</span>
                            <div className="flex items-center gap-2">
                              <Badge className={INVENTORY_BADGES[product.inventoryStatus] || "bg-gray-500"}>
                                {product.inventoryStatus.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">In stock</span>
                            <div className="font-medium">{product.inStock ? "Yes" : "No"}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price</span>
                            <div className="font-medium">AED {(product.priceFils / 100).toFixed(2)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        productIds={Array.from(selectedIds)}
        onSuccess={() => {
          clearSelection();
          setShowBulkDelete(false);
        }}
      />
    </>
  );
}
