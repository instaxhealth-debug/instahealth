"use client";

import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ProductCard } from "@/components/cards/ProductCard";
import type { StorefrontProduct } from "@/lib/api/products";

interface ProductGridProps {
  products?: StorefrontProduct[];
}

export function ProductGrid({ products: initialProducts }: ProductGridProps) {
  const products = initialProducts || [];
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <SkeletonCard key={i} variant="product" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 border border-border/50 rounded-2xl bg-muted/30">
        <p className="text-muted-foreground">No products available at this location.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
