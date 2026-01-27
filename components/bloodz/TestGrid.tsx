"use client";

import { useState, useEffect } from "react";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { TestCard } from "@/components/cards/TestCard";
import { mockBloodTests } from "@/lib/data/mock-data";
import type { BloodTest } from "@/types";

export function TestGrid() {
  const [tests, setTests] = useState<BloodTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real booking API call
    // For now, use mock data
    setTimeout(() => {
      setTests(mockBloodTests);
      setIsLoading(false);
    }, 800);
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} variant="test" />
        ))}
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="text-center py-16 border border-border/50 rounded-2xl bg-muted/30">
        <p className="text-muted-foreground">No tests available at this location.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tests.map((test) => (
        <TestCard key={test.id} test={test} />
      ))}
    </div>
  );
}
