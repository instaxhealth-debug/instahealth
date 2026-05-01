"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BookingCancelPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams?.get("bookingId");

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-amber-200 shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-amber-900">
              Booking Cancelled
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">
                Your booking payment was cancelled and no charges were made.
              </p>
              <p className="mt-2">
                You can try booking again whenever you&apos;re ready.
              </p>
            </div>

            {bookingId && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Booking ID: <span className="font-mono">{bookingId}</span>
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/marketplace">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Marketplace
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/account/bookings">
                  View My Bookings
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Need help? Contact our support team at{" "}
                <a
                  href="mailto:support@instahealth.com"
                  className="text-primary hover:underline"
                >
                  support@instahealth.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
