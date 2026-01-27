"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useLocationStore } from "@/lib/store/location-store";
import Link from "next/link";
import Image from "next/image";

export function CartView() {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const { address, isSelected } = useLocationStore();
  const total = getTotalPrice();

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some products to get started</p>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/pepz">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  if (!isSelected) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Please select a delivery location to proceed with checkout
          </p>
          <Button asChild className="rounded-full">
            <Link href="/">Select Location</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <Card key={`${item.product.id}-${item.variantId}`} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
                  {item.product.image && 
                   !item.product.image.startsWith("/Users") && 
                   (item.product.image.startsWith("/logos/") || item.product.image.startsWith("http")) ? (
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
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
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 line-clamp-2">{item.product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {item.product.currency} {item.product.price.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border border-border/50 rounded-xl">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-l-xl rounded-r-none"
                        onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-r-xl rounded-l-none"
                        onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.product.id, item.variantId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-base">
                    {item.product.currency} {(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Card className="sticky top-24 border-border/50">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{items[0]?.product.currency || "USD"} {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-muted-foreground">Calculated at checkout</span>
            </div>
            <div className="border-t border-border/50 pt-4">
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{items[0]?.product.currency || "USD"} {total.toFixed(2)}</span>
              </div>
            </div>
            <Button className="w-full rounded-full" size="lg" asChild>
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
            <Button variant="outline" className="w-full rounded-full" asChild>
              <Link href="/pepz">Continue Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
