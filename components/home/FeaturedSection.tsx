"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ProductCard } from "@/components/cards/ProductCard";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { TestCard } from "@/components/cards/TestCard";
import type { StorefrontProduct } from "@/lib/api/products";
import type { IVService, BloodTest } from "@/types";

interface FeaturedSectionProps {
  products?: StorefrontProduct[];
}

export function FeaturedSection({ products: initialProducts }: FeaturedSectionProps) {
  const products = initialProducts || [];
  const services: IVService[] = [];
  const tests: BloodTest[] = [];
  const isLoading = false;

  return (
    <div className="space-y-12">
      {/* Featured Products */}
      {products.length > 0 && (
        <section>
          <SectionHeader
            title="Featured Products"
            subtitle="Handpicked selections"
            action={{ label: "Shop all", href: "/marketplace/peptides" }}
          />
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} variant="product" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured IV Drips */}
      {services.length > 0 && (
        <section>
          <SectionHeader
            title="Featured IV Drips"
            subtitle="Popular IV therapy services"
            action={{ label: "View all", href: "/marketplace/iv-drips" }}
          />
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} variant="service" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured Blood Tests */}
      {tests.length > 0 && (
        <section>
          <SectionHeader
            title="Featured Blood Tests"
            subtitle="Comprehensive health testing"
            action={{ label: "View all", href: "/marketplace/blood-tests" }}
          />
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} variant="test" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
