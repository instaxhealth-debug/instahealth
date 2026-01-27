"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Calendar, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocationStore } from "@/lib/store/location-store";
import type { IVService, BloodTest, BookingSlot } from "@/types";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: IVService | BloodTest;
  itemType: "service" | "test";
}

export function BookingDialog({ open, onOpenChange, item, itemType }: BookingDialogProps) {
  const { address } = useLocationStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"date" | "time" | "payment">("date");

  useEffect(() => {
    if (open && selectedDate) {
      // TODO: Fetch available slots from booking API
      setIsLoading(true);
      setTimeout(() => {
        setAvailableSlots([]);
        setIsLoading(false);
      }, 500);
    }
  }, [open, selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep("time");
  };

  const handleSlotSelect = (slot: BookingSlot) => {
    setSelectedSlot(slot);
    setStep("payment");
  };

  const handleConfirmBooking = () => {
    // TODO: Process booking and payment
    onOpenChange(false);
    // Reset state
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep("date");
  };

  if (!address) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-lg max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-2xl font-bold">Book {item.name}</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Select a date and time for your {itemType === "service" ? "IV drip" : "blood test"}
          </Dialog.Description>

          {step === "date" && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Select Date</p>
              <div className="grid grid-cols-7 gap-2">
                {/* TODO: Implement date picker */}
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <Button
                    key={day}
                    variant="outline"
                    onClick={() => handleDateSelect(new Date())}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === "time" && (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setStep("date")}>
                ← Back
              </Button>
              <p className="text-sm font-medium">Select Time</p>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                      onClick={() => handleSlotSelect(slot)}
                    >
                      {new Date(slot.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No available slots for this date
                </p>
              )}
            </div>
          )}

          {step === "payment" && selectedSlot && (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setStep("time")}>
                ← Back
              </Button>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Service</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Date & Time</span>
                    <span className="font-medium">
                      {selectedDate?.toLocaleDateString()} at{" "}
                      {new Date(selectedSlot.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Location</span>
                    <span className="font-medium">{address.label}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>
                        {item.currency} {item.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button onClick={handleConfirmBooking} className="w-full" size="lg">
                Confirm & Pay
              </Button>
            </div>
          )}

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

