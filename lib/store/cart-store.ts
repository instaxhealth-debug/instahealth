import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types";

const CART_STORAGE_KEY = "instahealth-cart";
const LEGACY_CART_STORAGE_KEY = "instaxhealth-cart";

interface CartVariantSnapshot {
  id?: string;
  sku?: string;
  strength?: string;
  unitSize?: string;
  price?: number; // price in main currency (AED)
}

interface CartItem {
  product: Product;
  quantity: number;
  variantId?: string;
  variant?: CartVariantSnapshot;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, variantId?: string, quantity?: number, variant?: CartVariantSnapshot) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, variantId, quantity = 1, variant) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (item) => item.product.id === product.id && item.variantId === variantId
        );

        if (existingIndex >= 0) {
          const updated = [...items];
          updated[existingIndex].quantity += quantity;
          set({ items: updated });
        } else {
          set({ items: [...items, { product, variantId, variant, quantity }] });
        }
      },
      removeItem: (productId, variantId) => {
        set({
          items: get().items.filter(
            (item) => !(item.product.id === productId && item.variantId === variantId)
          ),
        });
      },
      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        const items = get().items.map((item) =>
          item.product.id === productId && item.variantId === variantId
            ? { ...item, quantity }
            : item
        );
        set({ items });
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      getTotalPrice: () =>
        get().items.reduce((sum, item) => {
          const price = item.variant?.price ?? item.product.price;
          return sum + price * item.quantity;
        }, 0),
    }),
    {
      name: CART_STORAGE_KEY,
    }
  )
);

// Migrate legacy cart storage to the new key
if (typeof window !== "undefined") {
  try {
    const legacyCart = localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    const newCart = localStorage.getItem(CART_STORAGE_KEY);
    if (legacyCart && !newCart) {
      localStorage.setItem(CART_STORAGE_KEY, legacyCart);
    }
    if (legacyCart) {
      localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    }
  } catch (e) {
    // Ignore migration errors
  }
}

