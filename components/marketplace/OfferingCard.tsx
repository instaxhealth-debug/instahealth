"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Calendar, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnhancedCart } from "@/hooks/use-enhanced-cart";
import { useToast } from "@/hooks/use-toast";
import type { Offering } from "@/types/offering";
import { isValidBookingUrl } from "@/lib/vendor-categories";

interface OfferingCardProps {
  offering: Offering;
  className?: string;
}

export function OfferingCard({ offering, className }: OfferingCardProps) {
  const { addItem } = useEnhancedCart();
  const { toast } = useToast();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await addItem(offering.id, undefined, 1);
      toast({
        title: "Added to cart",
        description: `${offering.name} added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const getRoute = () => {
    if (offering.type === "product") {
      return `/product/${offering.slug}`;
    }
    return `/marketplace/book/${offering.slug}`;
  };

  const stockStatus = offering.stockStatus
    ? offering.stockStatus === "in_stock"
      ? { label: "In stock", variant: "default" as const }
      : offering.stockStatus === "low_stock"
      ? { label: "Low stock", variant: "destructive" as const }
      : { label: "Out of stock", variant: "destructive" as const }
    : { label: "In stock", variant: "default" as const };

  const hasValidBooking =
    offering.type !== "product" &&
    !!offering.bookingUrl &&
    isValidBookingUrl(offering.bookingUrl);
  const route = offering.type === "product" ? getRoute() : hasValidBooking ? getRoute() : "#";

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-200 hover:shadow-lg border-border/50",
        className
      )}
    >
      <Link
        href={route}
        onClick={(event) => {
          if (route === "#") {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden bg-muted">
            {offering.image && 
             !offering.image.startsWith("/Users") && 
             (offering.image.startsWith("/logos/") || offering.image.startsWith("http")) ? (
              <Image
                src={offering.image}
                alt={offering.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".image-fallback")) {
                    const fallback = document.createElement("div");
                    fallback.className = "image-fallback w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center";
                    const span = document.createElement("span");
                    span.className = "text-muted-foreground text-xs";
                    span.textContent = "No image";
                    fallback.appendChild(span);
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <span className="text-muted-foreground text-xs">No image</span>
              </div>
            )}
            {offering.type === "product" && (
              <div className="absolute top-2 left-2">
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    stockStatus.variant === "default"
                      ? "bg-green-500 text-white"
                      : stockStatus.variant === "destructive"
                      ? stockStatus.label === "Low stock"
                        ? "bg-orange-500 text-white"
                        : "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  )}
                >
                  {stockStatus.label}
                </span>
              </div>
            )}
          </div>
          <div className="p-3 space-y-1.5">
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {offering.name}
            </h3>
            
            <div className="flex items-center justify-between pt-0.5">
              <span className="font-bold text-base text-gray-900">
                {offering.currency} {offering.price.toFixed(2)}
              </span>
              {offering.duration && (
                <span className="text-xs text-muted-foreground font-medium">
                  {offering.duration} min
                </span>
              )}
            </div>
            
            {offering.type === "product" ? (
              <Button
                onClick={handleAddToCart}
                className="w-full rounded-full mt-1.5 bg-primary hover:bg-primary/90 text-white font-semibold h-8 text-xs"
                size="sm"
                disabled={offering.stockStatus === "out_of_stock"}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Add to Cart
              </Button>
            ) : (
              <Button
                className="w-full rounded-full mt-1.5 bg-primary hover:bg-primary/90 text-white font-semibold h-8 text-xs"
                size="sm"
                disabled={!hasValidBooking}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!hasValidBooking) return;
                  window.location.href = getRoute();
                }}
              >
                {hasValidBooking ? (
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Ban className="h-3.5 w-3.5 mr-1.5" />
                )}
                {hasValidBooking
                  ? offering.type === "service"
                    ? "Book Now"
                    : "Book Test"
                  : "Unavailable"}
              </Button>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
