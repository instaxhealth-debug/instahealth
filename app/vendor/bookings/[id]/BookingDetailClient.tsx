"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, MapPin, Mail, Phone, Calendar, ExternalLink } from "lucide-react";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  amountFils: number;
  currency: string;
  notes: string | null;
  createdAt: Date;
  scheduledAt: Date | null;
  externalBookingRef: string | null;
  bookingUrlResolved: string | null;
  product: {
    name: string;
    description: string | null;
  };
  vendor: {
    name: string;
  };
  address: {
    formattedAddress: string;
    city: string | null;
    emirate: string | null;
    phone: string | null;
  };
}

interface BookingDetailClientProps {
  booking: Booking;
}

export function BookingDetailClient({ booking }: BookingDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [scheduledAt, setScheduledAt] = useState("");
  const [externalBookingRef, setExternalBookingRef] = useState(
    booking.externalBookingRef || ""
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  const handleMarkScheduled = async () => {
    if (!scheduledAt) {
      toast({
        title: "Missing information",
        description: "Please select a scheduled date/time",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch(`/api/vendor/bookings/${booking.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date(scheduledAt).toISOString(),
          externalBookingRef,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update booking");
      }

      toast({
        title: "Booking scheduled",
        description: "The booking has been marked as scheduled",
      });

      router.refresh();
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefund = async () => {
    if (!confirm("Are you sure you want to refund this booking? This action cannot be undone.")) {
      return;
    }

    setIsRefunding(true);

    try {
      const res = await fetch(`/api/vendor/bookings/${booking.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund");
      }

      toast({
        title: "Refund processed",
        description: "The booking has been refunded successfully",
      });

      router.refresh();
    } catch (error) {
      console.error("Refund error:", error);
      toast({
        title: "Refund failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const amountAED = (booking.amountFils / 100).toFixed(2);
  const canSchedule = booking.status === "PAID_AWAITING_SCHEDULE";
  const canRefund = ["PAID_AWAITING_SCHEDULE", "SCHEDULED"].includes(booking.status);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          ← Back to Bookings
        </Button>
      </div>

      <div className="space-y-6">
        {/* Booking Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Booking Details</CardTitle>
              <Badge
                variant={
                  booking.status === "SCHEDULED"
                    ? "secondary"
                    : booking.status === "COMPLETED"
                      ? "secondary"
                      : "default"
                }
              >
                {booking.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="font-mono text-sm">{booking.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{format(new Date(booking.createdAt), "PPP 'at' p")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-semibold">{booking.product.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-semibold">AED {amountAED}</p>
              </div>
            </div>

            {booking.scheduledAt && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Scheduled for
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {format(new Date(booking.scheduledAt), "PPP 'at' p")}
                  </p>
                </div>
              </div>
            )}

            {booking.externalBookingRef && (
              <div>
                <p className="text-sm text-muted-foreground">External Reference</p>
                <p className="font-mono">{booking.externalBookingRef}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.customerName}</p>
                <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p>{booking.customerPhone}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm">{booking.address.formattedAddress}</p>
                {booking.address.emirate && (
                  <p className="text-sm text-muted-foreground">{booking.address.emirate}</p>
                )}
              </div>
            </div>
            {booking.notes && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-1">Customer Notes</p>
                <p className="text-sm text-muted-foreground">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduling Actions */}
        {canSchedule && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule Appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.bookingUrlResolved && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                    Send customer to booking link:
                  </p>
                  <a
                    href={booking.bookingUrlResolved}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {booking.bookingUrlResolved}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <div>
                <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="externalRef">
                  External Booking Reference (Optional)
                </Label>
                <Input
                  id="externalRef"
                  value={externalBookingRef}
                  onChange={(e) => setExternalBookingRef(e.target.value)}
                  placeholder="e.g., Calendly confirmation ID"
                />
              </div>

              <Button
                onClick={handleMarkScheduled}
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Mark as Scheduled"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Refund Action */}
        {canRefund && (
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                Refund Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If the booking cannot be fulfilled, you can issue a full refund to the
                customer.
              </p>
              <Button
                variant="destructive"
                onClick={handleRefund}
                disabled={isRefunding}
                className="w-full"
              >
                {isRefunding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Refund...
                  </>
                ) : (
                  "Issue Full Refund"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
