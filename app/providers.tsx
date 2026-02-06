"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // PERFORMANCE FIX: Reduce session polling frequency
      // Default is every 0 seconds (constant refetching)
      // Set to 5 minutes - session rarely changes during browsing
      refetchInterval={5 * 60}
      // Only refetch when window regains focus (user returns to tab)
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}
