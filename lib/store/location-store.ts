import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address } from "@/types";

const STORAGE_KEY = "instahealth_location";
const LEGACY_STORAGE_KEY = "instaxhealth_location";

interface LocationState {
  address: Address | null;
  isSelected: boolean;
  setAddress: (address: Address | null) => void;
  clearAddress: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      address: null,
      isSelected: false,
      setAddress: (address) => {
        set({ address, isSelected: !!address });
        if (address) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch (e) {
            // Ignore localStorage errors
          }
        } else {
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch (e) {
            // Ignore localStorage errors
          }
        }
      },
      clearAddress: () => {
        set({ address: null, isSelected: false });
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (e) {
          // Ignore localStorage errors
        }
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);

// Hydrate from localStorage on initial load
if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      const address = JSON.parse(stored);
      useLocationStore.getState().setAddress(address);
      localStorage.setItem(STORAGE_KEY, stored);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (e) {
    // Ignore parse errors
  }
}
