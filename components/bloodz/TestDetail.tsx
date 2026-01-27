"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Home, Building2 } from "lucide-react";
import { useLocationStore } from "@/lib/store/location-store";
import { BookingDialog } from "@/components/booking/BookingDialog";
import { mockBloodTests } from "@/lib/data/mock-data";
import type { BloodTest } from "@/types";

interface TestDetailProps {
  slug: string;
}

export function TestDetail({ slug }: TestDetailProps) {
  const [test, setTest] = useState<BloodTest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { address, isSelected } = useLocationStore();

  useEffect(() => {
    // TODO: Fetch test from booking API
    // For now, use mock data
    setTimeout(() => {
      const found = mockBloodTests.find((t) => t.slug === slug);
      setTest(found || null);
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

  if (!test) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Test not found.</p>
      </div>
    );
  }

  // User-friendly description mapping
  const categoryDescriptions: Record<string, string> = {
    "cat-general": "Comprehensive health screening for overall wellness",
    "cat-performance": "Athlete-focused testing for performance optimization",
    "cat-hormones": "Complete hormone analysis for men and women",
  };

  const description = categoryDescriptions[test.categoryId] || test.description;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
          <p className="text-muted-foreground">Test Image</p>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{test.name}</h1>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl font-bold">
                {test.currency} {test.price.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{test.duration} minutes</span>
            </div>
            {test.canBeAtHome && (
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>Available at home</span>
              </div>
            )}
            {!test.canBeAtHome && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Clinic only</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-muted-foreground mb-4">{description}</p>
          </div>

          {test.markers && test.markers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What&apos;s Included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {test.markers.map((marker, idx) => (
                    <li key={idx} className="text-sm">
                      {marker}
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
        item={test}
        itemType="test"
      />
    </>
  );
}
