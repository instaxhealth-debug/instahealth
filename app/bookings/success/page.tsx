"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams?.get("bookingId");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams?.get("session_id");

    if (!bookingId && !sessionId) {
      router.push("/");
      return;
    }

    // Payment recovery: verify payment succeeded even if webhook failed
    const verifyPayment = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/bookings/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          setBooking(data.booking);

          if (process.env.NEXT_PUBLIC_DEBUG_BOOKINGS === "true" && data.recovered) {
            console.log("[BOOKING:SUCCESS] Payment recovered via verify endpoint", {
              bookingId: data.booking.id,
              recovered: true,
            });
          }
        }
      } catch (error) {
        console.error("[BOOKING:SUCCESS] Payment verification failed", error);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [bookingId, searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-green-900">
              Booking Confirmed!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">
                Your payment was successful and your booking has been confirmed.
              </p>
              <p className="mt-2">
                The vendor will contact you shortly to finalize the appointment time.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Booking ID:</span>
                <span className="font-mono text-xs">{bookingId}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                A confirmation email has been sent to your email address.
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/account/bookings">
                  View My Bookings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/marketplace">
                  Continue Shopping
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-primary">1.</span>
                  <span>The vendor will review your preferred date and time</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">2.</span>
                  <span>You&apos;ll receive a confirmation call or email with the exact appointment time</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">3.</span>
                  <span>The service will be provided at your specified address</span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
