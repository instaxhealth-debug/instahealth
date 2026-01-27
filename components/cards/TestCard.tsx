"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Home, Building2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BloodTest } from "@/types";

interface TestCardProps {
  test: BloodTest;
  className?: string;
}

export function TestCard({ test, className }: TestCardProps) {
  // User-friendly description mapping
  const categoryDescriptions: Record<string, string> = {
    "cat-general": "Comprehensive health screening",
    "cat-performance": "Athlete performance optimization",
    "cat-hormones": "Complete hormone analysis",
  };

  const description = categoryDescriptions[test.categoryId] || test.description;
  const resultsTime = "Results in 24-48 hrs";
  const nextCollection = "Today";

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-200 hover:shadow-medium border-border/50",
        className
      )}
    >
      <Link href={`/bloodz/tests/${test.slug}`}>
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden bg-muted">
            {test.image ? (
              <Image
                src={test.image}
                alt={test.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            )}
          </div>
          <div className="p-4 space-y-2">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {test.name}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{resultsTime}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Next collection: {nextCollection}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-base">
                {test.currency} {test.price.toFixed(2)}
              </span>
              <div className="flex items-center gap-2">
                {test.canBeAtHome ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Available at home">
                    <Home className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Clinic only">
                    <Building2 className="h-3 w-3" />
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{test.duration} min</span>
                </div>
              </div>
            </div>
            <Button
              className="w-full rounded-full mt-2"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/bloodz/tests/${test.slug}`;
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Book Now
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
