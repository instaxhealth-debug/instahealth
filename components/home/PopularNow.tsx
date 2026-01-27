"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductCard } from "@/components/cards/ProductCard";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { TestCard } from "@/components/cards/TestCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { mockIVServices, mockBloodTests } from "@/lib/data/mock-data";
import type { StorefrontProduct } from "@/lib/api/products";

interface PopularNowProps {
  products?: StorefrontProduct[];
}

export function PopularNow({ products: initialProducts }: PopularNowProps) {
  const products = initialProducts || [];
  const isLoading = false;
  
  // Mix of popular items (products from Prisma, services/tests from mock for now)
  const items = [
    ...(products.length > 0 ? [{ type: "product" as const, item: products[0] }] : []),
    { type: "service" as const, item: mockIVServices[0] },
    { type: "test" as const, item: mockBloodTests[0] },
    ...(products.length > 1 ? [{ type: "product" as const, item: products[1] }] : []),
    { type: "service" as const, item: mockIVServices[1] },
  ].filter(Boolean);

  if (isLoading) {
    return (
      <section>
        <SectionHeader title="Popular right now" />
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-48">
              <SkeletonCard variant="product" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title="Popular right now" action={{ label: "View all", href: "/marketplace/peptides" }} />
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex-shrink-0 w-48">
            {item.type === "product" && <ProductCard product={item.item} />}
            {item.type === "service" && <ServiceCard service={item.item} />}
            {item.type === "test" && <TestCard test={item.item} />}
          </div>
        ))}
      </div>
    </section>
  );
}
