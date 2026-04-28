"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Calendar, Ban, Check } from "lucide-react";
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
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdding || justAdded) return;

    setIsAdding(true);
    try {
      await addItem(offering.id, undefined, 1);

      setIsAdding(false);
      setJustAdded(true);

      toast({
        title: "Added to cart",
        description: offering.name,
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
        "group overflow-hidden transition-all duration-200 hover:shadow-lg border-border/50 w-full",
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
        <CardContent className="p-0 flex flex-col">
          <div className="relative w-full h-[180px] md:h-[220px] overflow-hidden bg-white">
            {offering.image &&
             !offering.image.startsWith("/Users") &&
             (offering.image.startsWith("/logos/") || offering.image.startsWith("http")) ? (
              <Image
                src={offering.image}
                alt={offering.name}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105 p-2"
                sizes="(max-width: 768px) 180px, 220px"
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
          <div className="p-3 flex flex-col h-[120px]">
            <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-tight h-10">
              {offering.name}
            </h3>

            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">
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
                  disabled={offering.stockStatus === "out_of_stock" || isAdding || justAdded}
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
                      Add to Cart
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full h-[42px] rounded-xl font-semibold bg-[#0ea5e9] hover:bg-[#0284c7]"
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
                    <Calendar className="h-4 w-4 mr-2" />
                  ) : (
                    <Ban className="h-4 w-4 mr-2" />
                  )}
                  {hasValidBooking
                    ? offering.type === "service"
                      ? "Book Now"
                      : "Book Test"
                    : "Unavailable"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
