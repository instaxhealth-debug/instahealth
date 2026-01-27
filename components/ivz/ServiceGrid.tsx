"use client";

import { useState, useEffect } from "react";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { mockIVServices } from "@/lib/data/mock-data";
import type { IVService } from "@/types";

export function ServiceGrid() {
  const [services, setServices] = useState<IVService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real booking API call
    // For now, use mock data
    setTimeout(() => {
      setServices(mockIVServices);
      setIsLoading(false);
    }, 800);
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} variant="service" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-16 border border-border/50 rounded-2xl bg-muted/30">
        <p className="text-muted-foreground">No services available at this location.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}
