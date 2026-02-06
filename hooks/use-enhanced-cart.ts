import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/cart-store";

export interface DBCartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPriceFils: number;
  product: any;
  variant: any;
}

export interface DBCart {
  id: string;
  userId: string;
  locationId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: DBCartItem[];
}

/**
 * useEnhancedCart: Production-grade cart state management
 * STATE INVALIDATION: After ANY mutation, call fetchDBCart() for fresh DB state.
 * Never rely on mutation response. Authenticated users ALWAYS use dbCart, NEVER localCart.
 */
export function useEnhancedCart() {
  const { data: session, status } = useSession();
  const localCart = useCartStore();
  const localCartItems = useCartStore((state) => state.items); // Subscribe to items changes
  const [dbCart, setDBCart] = useState<DBCart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch cart from database if logged in
  const fetchDBCart = useCallback(async () => {
    const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
    if (!session?.user?.id) return;

    if (DEBUG) console.log("[CART:UI] refreshCart called - fetching from /api/cart", { userId: session.user.id });
    setIsLoading(true);
    try {
      const res = await fetch("/api/cart", {
        cache: "no-store", // FIX: Prevent fetch caching
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (DEBUG) console.log("[CART:UI] refreshCart response:", { status: res.status, ok: res.ok });
      if (res.ok) {
        const cart = await res.json();
        if (DEBUG) console.log("[CART:UI] refreshCart data:", { cartId: cart.id, itemCount: cart.items?.length, items: cart.items });
        // FIX: Force new object reference AND increment refresh key to guarantee React state update
        setDBCart({ ...cart, items: [...(cart.items || [])] });
        setRefreshKey(prev => prev + 1);
      } else {
        if (DEBUG) console.log("[CART:UI] refreshCart failed:", await res.text());
      }
    } catch (error) {
      console.error("[FETCH CART]", error);
    }
    setIsLoading(false);
  }, [session?.user?.id]);

  // Merge guest cart into DB cart on login
  const mergeGuestCart = useCallback(async () => {
    const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
    if (!session?.user?.id || isMerging) return;

    const localItems = localCart.items;
    if (localItems.length === 0) {
      await fetchDBCart();
      return;
    }

    setIsMerging(true);
    try {
      const guestCartItems = localItems.map((item) => ({
        productId: item.product.id,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        unitPriceFils: item.variant?.price ? Math.round(item.variant.price * 100) : Math.round((item.product.price || 0) * 100),
      }));

      const res = await fetch("/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestCartItems }),
      });

      if (res.ok) {
        if (DEBUG) console.log("[CART:MERGE] Merge succeeded, fetching fresh cart state...");
        localCart.clearCart();
        await fetchDBCart();
      } else {
        if (DEBUG) console.log("[CART:MERGE] Merge failed:", await res.text());
      }
    } catch (error) {
      console.error("[MERGE CART]", error);
    }
    setIsMerging(false);
  }, [session?.user?.id, localCart, isMerging, fetchDBCart]);

  // Fetch DB cart when session becomes available
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      mergeGuestCart();
    }
  }, [status, session?.user?.id, mergeGuestCart]);

  // Add item to cart (local for guests, DB for logged-in)
  const addItem = useCallback(
    async (productId: string, variantId: string | undefined, quantity: number = 1) => {
      const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
      if (DEBUG) console.log("[CART:ADD] Starting addItem", { productId, variantId, quantity, status, userId: session?.user?.id });
      
      if (status === "authenticated" && session?.user?.id) {
        // Add to DB cart
        if (DEBUG) console.log("[CART:ADD] User authenticated, posting to /api/cart");
        setIsLoading(true);
        try {
          const payload = { productId, variantId, quantity, action: "add" };
          if (DEBUG) console.log("[CART:ADD] Request payload:", payload);
          
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (DEBUG) console.log("[CART:ADD] Response status:", res.status);
          
          if (res.ok) {
            if (DEBUG) console.log("[CART:ADD] Mutation succeeded, fetching fresh cart state...");
            await fetchDBCart();
          } else {
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.error("[CART:ADD] API error:", res.status, errorData);
            throw new Error(errorData.error || "Failed to add to cart");
          }
        } catch (error) {
          console.error("[ADD TO CART] Error:", error);
          throw error;
        } finally {
          setIsLoading(false);
        }
      } else {
        // Add to local cart
        // Fetch product details to pass to store
        try {
          const res = await fetch(`/api/products/${productId}`);
          if (res.ok) {
            const product = await res.json();
            localCart.addItem(product, variantId, quantity);
          }
        } catch (error) {
          console.error("[ADD TO LOCAL CART]", error);
        }
      }
    },
    [status, session?.user?.id, localCart, fetchDBCart]
  );

  // Remove item from cart
  const removeItem = useCallback(
    async (productId: string, variantId: string | undefined) => {
      const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
      if (DEBUG) console.log("[CART:REMOVE] Starting removeItem", { productId, variantId, userId: session?.user?.id });

      if (status === "authenticated" && session?.user?.id) {
        // Optimistic update: immediately remove from UI
        if (dbCart?.items) {
          const optimisticItems = dbCart.items.filter(item =>
            !(item.productId === productId && (item.variantId || null) === (variantId || null))
          );
          setDBCart({ ...dbCart, items: optimisticItems });
          setRefreshKey(prev => prev + 1);
        }

        try {
          const payload = { productId, variantId, quantity: 0, action: "remove" };
          if (DEBUG) console.log("[CART:REMOVE] Request payload:", payload);

          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (DEBUG) console.log("[CART:REMOVE] Response status:", res.status);

          if (res.ok) {
            if (DEBUG) console.log("[CART:REMOVE] Mutation succeeded, fetching fresh cart state...");
            await fetchDBCart();
          } else {
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.error("[CART:REMOVE] API error:", res.status, errorData);
            // Revert optimistic update on error
            await fetchDBCart();
            throw new Error(errorData.error || "Failed to remove item");
          }
        } catch (error) {
          console.error("[REMOVE FROM CART] Error:", error);
          // Revert optimistic update on error
          await fetchDBCart();
          throw error;
        }
      } else {
        localCart.removeItem(productId, variantId);
      }
    },
    [status, session?.user?.id, localCart, fetchDBCart, dbCart]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    async (productId: string, variantId: string | undefined, quantity: number) => {
      const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
      if (DEBUG) console.log("[CART:UPDATE] Starting updateQuantity", { productId, variantId, quantity, userId: session?.user?.id });

      if (status === "authenticated" && session?.user?.id) {
        // Optimistic update: immediately update UI
        if (dbCart?.items) {
          const optimisticItems = dbCart.items.map(item => {
            if (item.productId === productId && (item.variantId || null) === (variantId || null)) {
              return { ...item, quantity };
            }
            return item;
          }).filter(item => item.quantity > 0);

          setDBCart({ ...dbCart, items: optimisticItems });
          setRefreshKey(prev => prev + 1);
        }

        try {
          const payload = { productId, variantId, quantity, action: "update" };
          if (DEBUG) console.log("[CART:UPDATE] Request payload:", payload);

          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (DEBUG) console.log("[CART:UPDATE] Response status:", res.status);

          if (res.ok) {
            if (DEBUG) console.log("[CART:UPDATE] Mutation succeeded, fetching fresh cart state...");
            await fetchDBCart();
          } else {
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.error("[CART:UPDATE] API error:", res.status, errorData);
            // Revert optimistic update on error
            await fetchDBCart();
            throw new Error(errorData.error || "Failed to update quantity");
          }
        } catch (error) {
          console.error("[UPDATE QUANTITY] Error:", error);
          // Revert optimistic update on error
          await fetchDBCart();
          throw error;
        }
      } else {
        localCart.updateQuantity(productId, variantId, quantity);
      }
    },
    [status, session?.user?.id, localCart, fetchDBCart, dbCart]
  );

  // Get current cart items (GUARD: authenticated users NEVER use localCart)
  const getItems = useCallback(() => {
    const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
    if (status === "authenticated") {
      if (dbCart?.items) {
        if (DEBUG) console.log("[CART:UI] getItems - using DB cart:", { itemCount: dbCart.items.length, refreshKey });
        return dbCart.items;
      }
      return [];
    }
    if (DEBUG) console.log("[CART:UI] getItems - using local cart:", { itemCount: localCartItems.length });
    return localCartItems;
  }, [status, dbCart?.items, localCartItems, refreshKey]);

  // Get total items count (GUARD: authenticated users NEVER use localCart)
  const getTotalItems = useCallback(() => {
    if (status === "authenticated") {
      if (dbCart?.items) {
        return dbCart.items.reduce((sum, item) => sum + item.quantity, 0);
      }
      return 0;
    }
    return localCartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [status, dbCart?.items, localCartItems]);

  // Get total price in AED (GUARD: authenticated users NEVER use localCart, single source of truth)
  const getTotalPrice = useCallback(() => {
    if (status === "authenticated") {
      if (dbCart?.items) {
        return dbCart.items.reduce((sum, item) => {
          return sum + (item.unitPriceFils / 100) * item.quantity;
        }, 0);
      }
      return 0;
    }
    return localCartItems.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);
  }, [status, dbCart?.items, localCartItems]);

  // Clear cart
  const clearCart = useCallback(async () => {
    if (status === "authenticated" && session?.user?.id && dbCart?.id) {
      const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
      setIsLoading(true);
      try {
        for (const item of dbCart.items) {
          await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: item.productId,
              variantId: item.variantId,
              quantity: 0,
              action: "remove",
            }),
          });
        }
        if (DEBUG) console.log("[CART:CLEAR] All items removed, fetching fresh cart state...");
        await fetchDBCart();
      } catch (error) {
        console.error("[CLEAR CART]", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      localCart.clearCart();
    }
  }, [status, session?.user?.id, fetchDBCart, localCart]);

  return {
    items: getItems(),
    dbCart,
    isLoading: isLoading || isMerging,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    isLoggedIn: status === "authenticated",
    refreshKey, // Expose refresh key to force component re-renders
  };
}
