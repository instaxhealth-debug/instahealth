"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useEnhancedCart } from "@/hooks/use-enhanced-cart";
import { useToast } from "@/hooks/use-toast";
import { ComplianceDisclaimer } from "@/components/compliance/Disclaimer";
import { formatPriceAED } from "@/lib/utils/price";
import type { Product, ProductVariant } from "@prisma/client";

interface ProductDetailWithVariantsProps {
  product: Product & {
    vendor: { name: string };
    variants: ProductVariant[];
  };
}

export function ProductDetailWithVariants({ product }: ProductDetailWithVariantsProps) {
  const { addItem } = useEnhancedCart();
  const { toast } = useToast();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants.length > 0 ? product.variants[0]?.id || null : null
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const hasVariants = product.variants.length > 0;
  const canAddToCart = !hasVariants || selectedVariantId !== null;

  const handleAddToCart = async () => {
    if (!canAddToCart) {
      toast({
        title: "Please select a variant",
        description: "You must select a variant before adding to cart",
        variant: "destructive",
      });
      return;
    }

    const variantId = hasVariants ? selectedVariantId! : undefined;

    try {
      if (process.env.NEXT_PUBLIC_DEBUG_CART === "true") {
        console.log("[CART:PRODUCT_DETAIL] Adding item:", { productId: product.id, variantId, hasVariants, qty: quantity });
      }
      await addItem(product.id, variantId, quantity);
      toast({
        title: "Added to cart",
        description: `${product.name}${hasVariants ? ` (${selectedVariant?.strength})` : ""} added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const displayPrice = hasVariants && selectedVariant
    ? formatPriceAED(selectedVariant.priceFils)
    : formatPriceAED(product.priceFils);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <ComplianceDisclaimer />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {product.imageUrl &&
          (product.imageUrl.startsWith("/logos/") || product.imageUrl.startsWith("http")) ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <ShoppingCart className="h-24 w-24 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-muted-foreground">Vendor: {product.vendor.name}</p>
          </div>

          {product.description && (
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold">{displayPrice}</h2>
          </div>

          {hasVariants && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Variant *</label>
              <select
                value={selectedVariantId || ""}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-background px-4 py-2 text-sm"
                required
              >
                <option value="">Choose a variant</option>
                {product.variants
                  .filter((v) => v.active && v.inStock)
                  .map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.strength}
                      {variant.unitSize ? ` (${variant.unitSize})` : ""} - {formatPriceAED(variant.priceFils)}
                      {variant.sku ? ` - SKU: ${variant.sku}` : ""}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Quantity:</label>
            <div className="flex items-center gap-2 border border-border/50 rounded-xl">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-l-xl rounded-r-none"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-r-xl rounded-l-none"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>

          <Button
            onClick={handleAddToCart}
            className="w-full"
            size="lg"
            disabled={!canAddToCart || !product.inStock || !product.active}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {!canAddToCart
              ? "Select Variant"
              : !product.inStock
              ? "Out of Stock"
              : "Add to Cart"}
          </Button>

          {!product.inStock && (
            <p className="text-sm text-destructive">This product is currently out of stock.</p>
          )}
        </div>
      </div>
    </div>
  );
}
