"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, Plus, Minus, Loader2 } from "lucide-react";
import { useEnhancedCart } from "@/hooks/use-enhanced-cart";
import { useLocationStore } from "@/lib/store/location-store";
import { CartSkeleton } from "@/components/cart/CartSkeleton";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function CartView() {
  const { items, removeItem, updateQuantity, getTotalPrice, isLoading, refreshKey, isLoggedIn } = useEnhancedCart();
  const { address, isSelected } = useLocationStore();
  const router = useRouter();
  const { toast } = useToast();

  // Separate loading state for checkout navigation
  const [isNavigatingToCheckout, setIsNavigatingToCheckout] = useState(false);

  // Single source of truth for total price from hook
  const total = getTotalPrice();

  // Handle checkout navigation with authentication check
  const handleProceedToCheckout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("🔴 CHECKOUT BUTTON CLICKED - HANDLER FIRING");

    e.preventDefault();
    e.stopPropagation();

    const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";

    if (DEBUG) {
      console.log("[CART] Proceed to checkout clicked", {
        pathname: typeof window !== "undefined" ? window.location.pathname : "SSR",
        itemsCount: items.length,
        isLoading,
        isNavigatingToCheckout,
        isLoggedIn,
        total
      });
    }

    // Prevent double-clicks
    if (isNavigatingToCheckout) {
      if (DEBUG) console.log("[CART] Blocked: already navigating");
      return;
    }

    // Check if cart is empty
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add some items to your cart before proceeding to checkout",
        variant: "destructive",
      });
      if (DEBUG) console.log("[CART] Blocked: cart is empty");
      return;
    }

    // Validate cart total
    if (total <= 0) {
      toast({
        title: "Invalid cart total",
        description: "There was an issue calculating your cart total. Please refresh and try again.",
        variant: "destructive",
      });
      if (DEBUG) console.log("[CART] Blocked: invalid total", { total });
      return;
    }

    // CRITICAL FIX: Check authentication BEFORE navigating to checkout
    // Checkout page has a useEffect that immediately redirects unauthenticated users to /login
    // This causes the "button does nothing" bug because navigation is hijacked
    if (!isLoggedIn) {
      console.log("🟡 USER NOT LOGGED IN - redirecting to /login");
      if (DEBUG) console.log("[CART] User not authenticated, redirecting to login with callback");

      // Redirect to login with checkout as the callback destination
      router.push("/login?next=/checkout");
      return;
    }

    console.log("✅ USER IS LOGGED IN - proceeding to checkout");

    // Set loading state and navigate
    setIsNavigatingToCheckout(true);

    try {
      console.log("🔵 ABOUT TO CALL router.push('/checkout')");
      if (DEBUG) console.log("[CART] Navigating to /checkout (authenticated)");

      // Use router.push with error handling
      await router.push("/checkout");
      console.log("🟢 router.push('/checkout') COMPLETED");

      // If we reach here, navigation started successfully
      if (DEBUG) console.log("[CART] Navigation initiated successfully");

    } catch (error) {
      // Handle navigation errors
      console.error("[CART] Navigation error:", error);
      setIsNavigatingToCheckout(false);

      toast({
        title: "Navigation failed",
        description: "Unable to proceed to checkout. Please try again.",
        variant: "destructive",
      });

      if (DEBUG) console.error("[CART] Navigation error details:", error);
    }
  };

  // PERFORMANCE FIX: Show skeleton during initial load
  // Also handles the race condition where dbCart hasn't loaded yet
  if (isLoading) {
    return <CartSkeleton />;
  }

  // Only show "empty cart" message after loading is complete
  if (items.length === 0 && !isLoading) {
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

  // REMOVED: Location gate - cart should always be viewable
  // Address will be required at checkout instead

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" key={refreshKey}>
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => {
          // Handle both DB cart items (with unitPriceFils) and local cart items (with product.price)
          const isDBItem = (item as any).unitPriceFils !== undefined;
          const product = isDBItem ? (item as any).product : (item as any);
          const productId = product.id;
          const itemKey = `${productId}-${item.variantId}`;
          const itemPrice = isDBItem ? ((item as any).unitPriceFils / 100) : (product.price || 0);
          const productImage = product.image || product.imageUrl;
          
          return (
            <Card key={itemKey} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
                    {productImage && 
                     !productImage.startsWith("/Users") && 
                     (productImage.startsWith("/logos/") || productImage.startsWith("http")) ? (
                      <Image
                        src={productImage}
                        alt={product.name}
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
                    <h3 className="font-semibold mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {product.currency || "AED"} {itemPrice.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 border border-border/50 rounded-xl">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-l-xl rounded-r-none"
                          onClick={() => updateQuantity(productId, item.variantId || undefined, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-r-xl rounded-l-none"
                          onClick={() => updateQuantity(productId, item.variantId || undefined, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(productId, item.variantId || undefined)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-base">
                      {product.currency || "AED"} {(itemPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <Card className="sticky top-24 border-border/50">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">AED {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-muted-foreground">Calculated at checkout</span>
            </div>
            <div className="border-t border-border/50 pt-4">
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>AED {total.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Delivery address will be required at checkout
            </p>
            <Button
              type="button"
              className="w-full rounded-full"
              size="lg"
              onClick={handleProceedToCheckout}
              disabled={isLoading || isNavigatingToCheckout || items.length === 0 || total <= 0}
            >
              {isNavigatingToCheckout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Proceeding to checkout...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading cart...
                </>
              ) : (
                "Proceed to Checkout"
              )}
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
