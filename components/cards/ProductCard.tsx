"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, Check } from "lucide-react";
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
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdding || justAdded) return;

    setIsAdding(true);
    try {
      if (process.env.NEXT_PUBLIC_DEBUG_CART === "true") {
        console.log("[CART:PRODUCT_CARD] Adding item:", { productId: product.id, variantId: undefined, qty: 1 });
      }
      await addItem(product.id, undefined, 1);

      setIsAdding(false);
      setJustAdded(true);

      toast({
        title: "Added to cart",
        description: product.name,
        duration: 2000,
      });

      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      setIsAdding(false);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
        duration: 2000,
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
        "group overflow-hidden transition-all duration-200 hover:shadow-lg border-border/50 w-full md:w-[220px]",
        className
      )}
    >
      <a href={`/product/${product.slug}`} className="block">
        <CardContent className="p-0 flex flex-col">
          <div className="relative w-full h-[180px] md:h-[220px] overflow-hidden bg-white">
            {product.image &&
             !product.image.startsWith("/Users") &&
             (product.image.startsWith("/logos/") || product.image.startsWith("http")) ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105 p-2"
                sizes="(max-width: 768px) 180px, 220px"
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
          <div className="p-3 flex flex-col h-[140px]">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-2 group-hover:text-primary transition-colors h-10">
              {product.name}
            </h3>
            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">{product.priceDisplay}</p>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {deliveryTime}
                </span>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={isAdding || justAdded}
                className={cn(
                  "w-full h-[42px] rounded-xl font-semibold transition-all",
                  justAdded
                    ? "bg-green-600 hover:bg-green-600"
                    : "bg-[#0ea5e9] hover:bg-[#0284c7]"
                )}
                size="sm"
              >
                {isAdding ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : justAdded ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Added
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to cart
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </a>
    </Card>
  );
}
