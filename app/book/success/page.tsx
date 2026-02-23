"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  bookingUrlResolved?: string | null;
  product: {
    name: string;
  };
  vendor: {
    name: string;
  };
  amountFils: number;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) {
        setError("No booking ID provided");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch booking");
        }

        setBooking(data);
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError(err instanceof Error ? err.message : "Failed to load booking");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error || "Unable to load booking information."}
            </p>
            <Link href="/marketplace">
              <Button>Return to Marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountAED = (booking.amountFils / 100).toFixed(2);

  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-semibold">{booking.product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-semibold">{booking.vendor.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-semibold">{booking.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-semibold">AED {amountAED}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-semibold capitalize">
                {booking.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {booking.bookingUrlResolved && (
            <div className="space-y-3">
              <h3 className="font-semibold">Next Step: Schedule Your Appointment</h3>
              <p className="text-sm text-muted-foreground">
                Click below to select your exact time slot with the provider.
              </p>
              <a
                href={booking.bookingUrlResolved}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full" size="lg">
                  Book Your Exact Time
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Important:</strong> Your payment reserves this booking. You&apos;ll now
              select your exact time slot with the provider. If scheduling cannot be
              completed, you&apos;ll receive a full refund.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to{" "}
              <strong>{booking.customerEmail}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Booking ID: <code className="text-xs">{booking.id}</code>
            </p>
          </div>

          <div className="pt-4 border-t">
            <Link href="/marketplace">
              <Button variant="outline" className="w-full">
                Return to Marketplace
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}
