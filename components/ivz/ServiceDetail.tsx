"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Droplet } from "lucide-react";
import { useLocationStore } from "@/lib/store/location-store";
import { BookingDialog } from "@/components/booking/BookingDialog";
import { mockIVServices } from "@/lib/data/mock-data";
import type { IVService } from "@/types";

interface ServiceDetailProps {
  slug: string;
}

export function ServiceDetail({ slug }: ServiceDetailProps) {
  const [service, setService] = useState<IVService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { address, isSelected } = useLocationStore();

  useEffect(() => {
    // TODO: Fetch service from booking API
    // For now, use mock data
    setTimeout(() => {
      const found = mockIVServices.find((s) => s.slug === slug);
      setService(found || null);
      setIsLoading(false);
    }, 500);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Service not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
          <p className="text-muted-foreground">Service Image</p>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{service.name}</h1>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl font-bold">
                {service.currency} {service.price.toFixed(2)}
              </span>
              {service.deposit && (
                <span className="text-sm text-muted-foreground">
                  Deposit: {service.currency} {service.deposit.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{service.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplet className="h-4 w-4" />
              <span>Mobile service</span>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-4">{service.description}</p>
          </div>

          {service.benefits && service.benefits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {service.benefits.map((benefit, idx) => (
                    <li key={idx} className="text-sm">
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => {
              if (!isSelected) {
                // TODO: Show location selector
                return;
              }
              setBookingOpen(true);
            }}
            className="w-full rounded-full"
            size="lg"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Book Appointment
          </Button>
        </div>
      </div>

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        item={service}
        itemType="service"
      />
    </>
  );
}
