"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  amountFils: number;
  createdAt: Date;
  scheduledAt: Date | null;
  product: {
    name: string;
    slug: string;
  };
  address: {
    formattedAddress: string;
    city: string | null;
    emirate: string | null;
  };
}

interface BookingsListProps {
  bookings: Booking[];
}

export function BookingsList({ bookings }: BookingsListProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    return booking.status === filter;
  });

  const statusCounts = {
    all: bookings.length,
    PAYMENT_PENDING: bookings.filter((b) => b.status === "PAYMENT_PENDING").length,
    PAID_AWAITING_SCHEDULE: bookings.filter((b) => b.status === "PAID_AWAITING_SCHEDULE")
      .length,
    SCHEDULED: bookings.filter((b) => b.status === "SCHEDULED").length,
    COMPLETED: bookings.filter((b) => b.status === "COMPLETED").length,
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      PAYMENT_PENDING: { label: "Pending Payment", variant: "outline" },
      PAID_AWAITING_SCHEDULE: { label: "Awaiting Schedule", variant: "default" },
      SCHEDULED: { label: "Scheduled", variant: "secondary" },
      COMPLETED: { label: "Completed", variant: "secondary" },
      CANCELLED: { label: "Cancelled", variant: "destructive" },
      REFUNDED: { label: "Refunded", variant: "destructive" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({statusCounts.all})
            </Button>
            <Button
              variant={filter === "PAID_AWAITING_SCHEDULE" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("PAID_AWAITING_SCHEDULE")}
            >
              Awaiting ({statusCounts.PAID_AWAITING_SCHEDULE})
            </Button>
            <Button
              variant={filter === "SCHEDULED" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("SCHEDULED")}
            >
              Scheduled ({statusCounts.SCHEDULED})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredBookings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No bookings found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-xs">
                    {booking.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{booking.product.name}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.customerPhone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{booking.address.city || "N/A"}</p>
                  </TableCell>
                  <TableCell>AED {(booking.amountFils / 100).toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(booking.createdAt), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Link href={`/vendor/bookings/${booking.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
