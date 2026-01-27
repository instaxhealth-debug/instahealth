"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { TestCard } from "@/components/cards/TestCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { mockIVServices, mockBloodTests } from "@/lib/data/mock-data";
import { useState, useEffect } from "react";

export function MostBooked() {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState(mockIVServices);
  const [tests, setTests] = useState(mockBloodTests);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  }, []);

  if (isLoading) {
    return (
      <section>
        <SectionHeader title="Most booked this week" />
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-64">
              <SkeletonCard variant="service" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const allBookings = [
    ...services.map((s) => ({ type: "service" as const, item: s })),
    ...tests.map((t) => ({ type: "test" as const, item: t })),
  ];

  return (
    <section>
      <SectionHeader title="Most booked this week" action={{ label: "View all", href: "/marketplace/iv-drips" }} />
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {allBookings.map((booking, idx) => (
          <div key={idx} className="flex-shrink-0 w-64">
            {booking.type === "service" && <ServiceCard service={booking.item} />}
            {booking.type === "test" && <TestCard test={booking.item} />}
          </div>
        ))}
      </div>
    </section>
  );
}
