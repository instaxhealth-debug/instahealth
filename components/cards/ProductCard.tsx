"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnhancedCart } from "@/hooks/use-enhanced-cart";
import { useToast } from "@/hooks/use-toast";
import type { StorefrontProduct } from "@/lib/api/products";

interface ProductCardProps {
  product: StorefrontProduct;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem } = useEnhancedCart();
  const { toast } = useToast();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (process.env.NEXT_PUBLIC_DEBUG_CART === "true") {
        console.log("[CART:PRODUCT_CARD] Adding item:", { productId: product.id, variantId: undefined, qty: 1 });
      }
      await addItem(product.id, undefined, 1);
      toast({
        title: "Added to cart",
        description: `${product.name} added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const stockStatus = product.inventoryQuantity
    ? product.inventoryQuantity > 10
      ? { label: "In stock", variant: "default" as const }
      : { label: "Low stock", variant: "destructive" as const }
    : { label: "In stock", variant: "default" as const };

  // Delivery time signal
  const deliveryTime = "Delivery today";

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-200 hover:shadow-medium border-border/50",
        className
      )}
    >
      <a href={`/product/${product.slug}`}>
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden bg-muted">
            {product.image && 
             !product.image.startsWith("/Users") && 
             (product.image.startsWith("/logos/") || product.image.startsWith("http")) ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".image-fallback")) {
                    const fallback = document.createElement("div");
                    fallback.className = "image-fallback w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50";
                    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    icon.setAttribute("class", "h-12 w-12 text-muted-foreground/30");
                    icon.setAttribute("fill", "none");
                    icon.setAttribute("viewBox", "0 0 24 24");
                    icon.setAttribute("stroke", "currentColor");
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("stroke-linecap", "round");
                    path.setAttribute("stroke-linejoin", "round");
                    path.setAttribute("stroke-width", "2");
                    path.setAttribute("d", "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z");
                    icon.appendChild(path);
                    fallback.appendChild(icon);
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <div className="p-3 md:p-4 space-y-2">
            <div>
              <h3 className="font-semibold text-sm md:text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 hidden md:block">
                  {product.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xl md:text-lg font-bold">{product.priceDisplay}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {deliveryTime}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleAddToCart}
              className="w-full mt-2"
              size="sm"
              variant="default"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to cart
            </Button>
          </div>
        </CardContent>
      </a>
    </Card>
  );
}
