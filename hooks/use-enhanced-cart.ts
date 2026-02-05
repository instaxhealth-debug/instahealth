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

export function useEnhancedCart() {
  const { data: session, status } = useSession();
  const localCart = useCartStore();
  const [dbCart, setDBCart] = useState<DBCart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Fetch cart from database if logged in
  const fetchDBCart = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const cart = await res.json();
        setDBCart(cart);
      }
    } catch (error) {
      console.error("[FETCH CART]", error);
    }
    setIsLoading(false);
  }, [session?.user?.id]);

  // Merge guest cart into DB cart on login
  const mergeGuestCart = useCallback(async () => {
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
        const result = await res.json();
        setDBCart(result.cart);
        localCart.clearCart(); // Clear local cart after merge
      }
    } catch (error) {
      console.error("[MERGE CART]", error);
    }
    setIsMerging(false);
  }, [session?.user?.id, localCart, isMerging]);

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
            const cart = await res.json();
            if (DEBUG) console.log("[CART:ADD] Cart updated:", { itemCount: cart.items?.length, cartId: cart.id });
            setDBCart(cart);
          } else {
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.error("[CART:ADD] API error:", res.status, errorData);
            throw new Error(errorData.error || "Failed to add to cart");
          }
        } catch (error) {
          console.error("[ADD TO CART] Error:", error);
          throw error;
        }
        setIsLoading(false);
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
    [status, session?.user?.id, localCart]
  );

  // Remove item from cart
  const removeItem = useCallback(
    async (productId: string, variantId: string | undefined) => {
      const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
      if (DEBUG) console.log("[CART:REMOVE] Starting removeItem", { productId, variantId, userId: session?.user?.id });
      
      if (status === "authenticated" && session?.user?.id) {
        setIsLoading(true);
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
            const cart = await res.json();
            if (DEBUG) console.log("[CART:REMOVE] Cart updated:", { itemCount: cart.items?.length, cartId: cart.id });
            setDBCart(cart);
          } else {
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.error("[CART:REMOVE] API error:", res.status, errorData);
            throw new Error(errorData.error || "Failed to remove item");
          }
        } catch (error) {
          console.error("[REMOVE FROM CART] Error:", error);
          throw error;
        }
        setIsLoading(false);
      } else {
        localCart.removeItem(productId, variantId);
      }
    },
    [status, session?.user?.id, localCart]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    async (productId: string, variantId: string | undefined, quantity: number) => {
      const DEBUG = process.env.NEXT_PUBLIC_DEBUG_CART === "true";
      if (DEBUG) console.log("[CART:UPDATE] Starting updateQuantity", { productId, variantId, quantity, userId: session?.user?.id });
      
      if (status === "authenticated" && session?.user?.id) {
        setIsLoading(true);
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
            const cart = await res.json();
            if (DEBUG) console.log("[CART:UPDATE] Cart updated:", { itemCount: cart.items?.length, cartId: cart.id });
            setDBCart(cart);
          } else {
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.error("[CART:UPDATE] API error:", res.status, errorData);
            throw new Error(errorData.error || "Failed to update quantity");
          }
        } catch (error) {
          console.error("[UPDATE QUANTITY] Error:", error);
          throw error;
        }
        setIsLoading(false);
      } else {
        localCart.updateQuantity(productId, variantId, quantity);
      }
    },
    [status, session?.user?.id, localCart]
  );

  // Get current cart items
  const getItems = useCallback(() => {
    if (status === "authenticated" && dbCart?.items) {
      return dbCart.items;
    }
    return localCart.items;
  }, [status, dbCart?.items, localCart.items]);

  // Get total items count
  const getTotalItems = useCallback(() => {
    if (status === "authenticated" && dbCart?.items) {
      return dbCart.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    return localCart.getTotalItems();
  }, [status, dbCart?.items, localCart]);

  // Get total price in AED
  const getTotalPrice = useCallback(() => {
    if (status === "authenticated" && dbCart?.items) {
      return dbCart.items.reduce((sum, item) => {
        return sum + (item.unitPriceFils / 100) * item.quantity;
      }, 0);
    }
    return localCart.getTotalPrice();
  }, [status, dbCart?.items, localCart]);

  // Clear cart
  const clearCart = useCallback(async () => {
    if (status === "authenticated" && session?.user?.id && dbCart?.id) {
      setIsLoading(true);
      try {
        // Delete all items from DB cart
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
        setDBCart({ ...dbCart, items: [] });
      } catch (error) {
        console.error("[CLEAR CART]", error);
      }
      setIsLoading(false);
    } else {
      localCart.clearCart();
    }
  }, [status, session?.user?.id, dbCart, localCart]);

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
  };
}
