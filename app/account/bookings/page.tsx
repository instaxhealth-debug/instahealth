'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, Package, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { Booking, IVService, BloodTest } from '@/types';

interface BookingWithVendor extends Booking {
  vendor?: {
    name: string;
    businessName?: string;
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithVendor | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/bookings/user');

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      setCancellingId(selectedBooking.id);
      const response = await fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          status: 'cancelled',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === selectedBooking.id ? { ...booking, status: 'cancelled' } : booking
        )
      );
      setShowCancelDialog(false);
      setSelectedBooking(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusConfig = (status: Booking['status']) => {
    const configs = {
      pending: {
        label: 'Pending',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Clock,
      },
      confirmed: {
        label: 'Confirmed',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: CheckCircle2,
      },
      completed: {
        label: 'Completed',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle2,
      },
      cancelled: {
        label: 'Cancelled',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircle,
      },
    };
    return configs[status];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (address?: Booking['address']) => {
    if (!address) return 'Address not provided';
    return `${address.street}, ${address.city}, ${address.state || ''} ${address.postalCode}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Error Loading Bookings</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchBookings} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
          <div className="rounded-full bg-muted p-6">
            <Package className="h-16 w-16 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">No bookings yet</h2>
            <p className="text-muted-foreground max-w-md">
              You haven&apos;t made any bookings yet. Browse our services to get started.
            </p>
          </div>
          <Button asChild size="lg">
            <a href="/marketplace">Browse Services</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground">
            Manage and track your service appointments
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {bookings.map((booking) => {
            const statusConfig = getStatusConfig(booking.status);
            const StatusIcon = statusConfig.icon;
            const item = booking.item as IVService | BloodTest;

            return (
              <Card key={booking.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative bg-muted overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/10 to-primary/5">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge className={statusConfig.className + ' flex items-center gap-1'}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>

                <CardHeader>
                  <div className="space-y-2">
                    <CardTitle className="line-clamp-2">{item.name}</CardTitle>
                    {booking.vendor && (
                      <p className="text-sm text-muted-foreground">
                        by {booking.vendor.businessName || booking.vendor.name}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{formatDate(booking.slot.startTime)}</p>
                        <p className="text-muted-foreground">
                          {formatTime(booking.slot.startTime)} - {formatTime(booking.slot.endTime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground line-clamp-2">
                        {formatAddress(booking.address)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-muted-foreground">Duration: {item.duration} minutes</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      View Details
                    </Button>
                    {booking.status === 'pending' && (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowCancelDialog(true);
                        }}
                        disabled={cancellingId === booking.id}
                      >
                        {cancellingId === booking.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel Booking'
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking && !showCancelDialog} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle>Booking Details</DialogTitle>
                <DialogDescription>
                  Booking ID: {selectedBooking.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {(selectedBooking.item as IVService | BloodTest).image && (
                  <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={(selectedBooking.item as IVService | BloodTest).image!}
                      alt={(selectedBooking.item as IVService | BloodTest).name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {(selectedBooking.item as IVService | BloodTest).name}
                    </h3>
                    {selectedBooking.vendor && (
                      <p className="text-sm text-muted-foreground">
                        by {selectedBooking.vendor.businessName || selectedBooking.vendor.name}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge className={getStatusConfig(selectedBooking.status).className}>
                        {getStatusConfig(selectedBooking.status).label}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                      <Badge variant={selectedBooking.paymentStatus === 'paid' ? 'default' : 'outline'}>
                        {selectedBooking.paymentStatus.charAt(0).toUpperCase() + selectedBooking.paymentStatus.slice(1)}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Date</p>
                      <p className="text-sm">{formatDate(selectedBooking.slot.startTime)}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Time</p>
                      <p className="text-sm">
                        {formatTime(selectedBooking.slot.startTime)} - {formatTime(selectedBooking.slot.endTime)}
                      </p>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="text-sm">{formatAddress(selectedBooking.address)}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Amount</p>
                      <p className="text-sm font-semibold">
                        {selectedBooking.currency} {selectedBooking.amount.toFixed(2)}
                      </p>
                    </div>

                    {selectedBooking.deposit && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Deposit Paid</p>
                        <p className="text-sm">
                          {selectedBooking.currency} {selectedBooking.deposit.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedBooking.notes && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedBooking.notes}</p>
                    </div>
                  )}

                  {(selectedBooking.item as IVService).benefits && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Benefits</p>
                      <ul className="text-sm space-y-1">
                        {(selectedBooking.item as IVService).benefits!.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(selectedBooking.item as BloodTest).markers && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Test Markers</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedBooking.item as BloodTest).markers!.map((marker, idx) => (
                          <Badge key={idx} variant="secondary">
                            {marker}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setSelectedBooking(null);
              }}
              disabled={!!cancellingId}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={!!cancellingId}
            >
              {cancellingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
