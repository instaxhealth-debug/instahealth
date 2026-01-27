"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Droplet, TestTube } from "lucide-react";
import Link from "next/link";
import { useLocationStore } from "@/lib/store/location-store";
import { getNextDeliveryTime, getNextBookingSlot, getNextCollectionSlot } from "@/lib/data/mock-data";
import { useState, useEffect } from "react";

export function AvailableNow() {
  const { isSelected, address } = useLocationStore();
  const [deliveryInfo, setDeliveryInfo] = useState<{ available: boolean; message: string } | null>(null);
  const [ivSlot, setIvSlot] = useState<{ available: boolean; message: string } | null>(null);
  const [testSlot, setTestSlot] = useState<{ available: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSelected) {
      setTimeout(() => {
        setDeliveryInfo(getNextDeliveryTime());
        setIvSlot(getNextBookingSlot());
        setTestSlot(getNextCollectionSlot());
        setIsLoading(false);
      }, 500);
    } else {
      setIsLoading(false);
    }
  }, [isSelected]);

  if (!isSelected) {
    return null;
  }

  const items = [
    {
      id: "1",
      icon: Package,
      primaryText: deliveryInfo?.message === "Delivery today" ? "Same-day delivery" : "Next-day delivery",
      secondaryText: "In your area",
      link: "/marketplace/peptides",
      cta: "Shop now",
    },
    {
      id: "2",
      icon: Droplet,
      primaryText: "Nurse available today",
      secondaryText: "Limited slots",
      link: "/marketplace/iv-drips",
      cta: "Book now",
    },
    {
      id: "3",
      icon: TestTube,
      primaryText: "Collection available today",
      secondaryText: "At home or clinic",
      link: "/marketplace/blood-tests",
      cta: "Book now",
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Available now in {address?.city || "your area"}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className="group overflow-hidden transition-all duration-200 hover:shadow-medium border-border/50"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{item.primaryText}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{item.secondaryText}</p>
                    <Button
                      asChild
                      size="sm"
                      className="w-full rounded-full text-xs h-8"
                    >
                      <Link href={item.link}>{item.cta}</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
