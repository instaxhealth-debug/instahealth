/**
 * Shopify Embedded App Layout
 *
 * CRITICAL: This layout MUST NOT include:
 * - Site header/footer (breaks embedded iframe)
 * - Site navigation (not needed in Shopify admin context)
 * - Any auth guards (Shopify handles auth)
 *
 * This is a minimal layout for Shopify embedded app pages
 */

import { Toaster } from "@/components/ui/toaster";

export default function ShopifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* No header, no footer, no navigation - just the app content */}
      {children}

      {/* Keep toaster for notifications */}
      <Toaster />
    </>
  );
}
