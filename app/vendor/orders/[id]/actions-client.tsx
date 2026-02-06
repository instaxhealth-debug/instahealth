"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { VendorOrderStatus } from "@prisma/client";

interface VendorOrderActionsProps {
  vendorOrderId: string;
  status: VendorOrderStatus;
  canAccept: boolean;
  canReject: boolean;
  canStart: boolean;
  canComplete: boolean;
}

export function VendorOrderActions({
  vendorOrderId,
  status,
  canAccept,
  canReject,
  canStart,
  canComplete,
}: VendorOrderActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vendor/orders/${vendorOrderId}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to accept order");
      }

      toast({
        title: "Order Accepted",
        description: "You can now fulfill this order",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/vendor/orders/${vendorOrderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject order");
      }

      toast({
        title: "Order Rejected",
        description: "The order has been marked as rejected",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowRejectForm(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vendor/orders/${vendorOrderId}/complete`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to complete order");
      }

      toast({
        title: "Order Completed",
        description: "The order has been marked as fulfilled",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vendor/orders/${vendorOrderId}/start`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to start order");
      }

      toast({
        title: "Order Started",
        description: "Order moved to In Progress",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show actions if none are available
  if (!canAccept && !canReject && !canStart && !canComplete) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canAccept && (
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Accept Order
          </Button>
        )}

        {canReject && (
          <div className="space-y-2">
            {!showRejectForm ? (
              <Button
                onClick={() => setShowRejectForm(true)}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Order
              </Button>
            ) : (
              <div className="space-y-2 p-4 border rounded-lg">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why are you rejecting this order?"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleReject}
                    disabled={isLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      "Confirm Rejection"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason("");
                    }}
                    variant="outline"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {canComplete && (
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className="w-full"
            size="lg"
            variant="default"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Mark as Completed
          </Button>
        )}

        {canStart && (
          <Button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full"
            size="lg"
            variant="default"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Start Order
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
