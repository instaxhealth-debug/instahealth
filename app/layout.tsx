import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import { getActiveLocations, getSelectedLocation } from "@/lib/location";
import { logDatabaseConnection } from "@/lib/db/guardrail";

const inter = Inter({ subsets: ["latin"] });

// Log database connection on server boot
logDatabaseConnection();

export const metadata: Metadata = {
  title: "InstaHealth - Your Health Marketplace",
  description: "Multi-vertical health marketplace for products, IV drips, and blood testing",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locations, selectedLocation] = await Promise.all([
    getActiveLocations(),
    getSelectedLocation(),
  ]);

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {/* Desktop Header - hidden on mobile */}
          <Header initialLocation={selectedLocation} locations={locations} />
          
          {/* Mobile Header - visible only on mobile */}
          <MobileHeader initialLocation={selectedLocation} locations={locations} />
          
          {/* Main content with bottom padding on mobile for bottom nav */}
          <main className="min-h-screen pb-16 md:pb-0">{children}</main>
          
          <Footer />
          
          {/* Mobile Bottom Navigation - visible only on mobile */}
          <MobileBottomNav />
          
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

