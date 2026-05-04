"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format, addDays, isSameDay } from "date-fns";

interface TimeSlot {
  start: string; // ISO string
  end: string;
  available: boolean;
  formattedTime: string;
}

interface TimeSlotPickerProps {
  vendorId: string;
  productId: string;
  onSlotSelect: (start: string, end: string) => void;
  selectedStart?: string;
}

export function TimeSlotPicker({
  vendorId,
  productId,
  onSlotSelect,
  selectedStart,
}: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  useEffect(() => {
    if (vendorId && productId && selectedDate) {
      fetchSlots();
    }
  }, [vendorId, productId, selectedDate]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/bookings/slots?vendorId=${vendorId}&productId=${productId}&date=${dateStr}`
      );

      if (!response.ok) {
        throw new Error("Failed to load available time slots");
      }

      const data = await response.json();
      setSlots(data.slots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slots");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.available) {
      onSlotSelect(slot.start, slot.end);
    }
  };

  const availableSlots = slots.filter(s => s.available);
  const hasAvailableSlots = availableSlots.length > 0;

  return (
    <div className="space-y-4">
      {/* Date Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Select Date *
        </Label>
        <div className="grid grid-cols-7 gap-2">
          {availableDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`
                  p-2 rounded-lg border text-center transition-all
                  ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }
                `}
              >
                <div className="text-[10px] font-medium uppercase text-muted-foreground">
                  {format(date, "EEE")}
                </div>
                <div className="text-sm font-semibold">
                  {format(date, "dd")}
                </div>
                {isToday && (
                  <div className="text-[9px] text-primary font-medium">Today</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Select Time *
        </Label>

        {loading ? (
          <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/20">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading available times...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 border rounded-lg bg-red-50 border-red-200">
            <div className="text-center max-w-xs">
              <AlertCircle className="h-6 w-6 mx-auto text-red-600 mb-2" />
              <p className="text-sm text-red-900">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchSlots}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : !hasAvailableSlots ? (
          <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/20">
            <div className="text-center max-w-xs">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground font-medium">
                No available time slots
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try another date
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
            {slots.map((slot, index) => {
              const isSelected = slot.start === selectedStart;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSlotClick(slot)}
                  disabled={!slot.available}
                  className={`
                    p-3 rounded-lg border text-sm font-medium transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : slot.available
                        ? "border-border hover:border-primary/70 hover:bg-primary/5"
                        : "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                    }
                  `}
                >
                  {slot.formattedTime}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Slot Summary */}
      {selectedStart && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900">
            Selected: {format(selectedDate, "EEEE, MMMM dd, yyyy")}
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            {slots.find(s => s.start === selectedStart)?.formattedTime}
          </p>
        </div>
      )}
    </div>
  );
}
