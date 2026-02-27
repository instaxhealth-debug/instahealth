"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IVService } from "@/types";

interface ServiceCardProps {
  service: IVService;
  className?: string;
}

export function ServiceCard({ service, className }: ServiceCardProps) {
  // Next available signal
  const nextAvailable = "Today";

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-200 hover:shadow-medium border-border/50",
        className
      )}
    >
      <Link href={`/ivz/services/${service.slug}`}>
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden bg-muted">
            {service.image &&
             !service.image.startsWith("/Users") &&
             (service.image.startsWith("/logos/") || service.image.startsWith("http")) ? (
              <Image
                src={service.image}
                alt={service.name}
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
              {service.name}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Next available: {nextAvailable}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="font-semibold text-base">
                  {service.currency} {service.price.toFixed(2)}
                </span>
                {service.deposit && (
                  <p className="text-xs text-muted-foreground">
                    Deposit: {service.currency} {service.deposit.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{service.duration} min</span>
              </div>
            </div>
            <Button
              className="w-full rounded-full mt-2"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/ivz/services/${service.slug}`;
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
