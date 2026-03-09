"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BulkDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onSuccess?: () => void;
}

interface BulkDeleteResult {
  deleted: number;
  archived: number;
  failed: number;
  results: Array<{
    productId: string;
    action: "deleted" | "archived" | "failed";
    error?: string;
  }>;
}

export function BulkDeleteModal({
  open,
  onOpenChange,
  productIds,
  onSuccess,
}: BulkDeleteModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/vendor/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });

      const data: BulkDeleteResult = await response.json();

      if (!response.ok) {
        throw new Error("Failed to delete products");
      }

      // Build summary message
      const parts: string[] = [];
      if (data.deleted > 0) {
        parts.push(`${data.deleted} deleted`);
      }
      if (data.archived > 0) {
        parts.push(`${data.archived} archived`);
      }
      if (data.failed > 0) {
        parts.push(`${data.failed} failed`);
      }

      toast({
        title: "Bulk Delete Complete",
        description: parts.join(", "),
      });

      onOpenChange(false);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Refresh the page
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete products",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {productIds.length} Product{productIds.length === 1 ? "" : "s"}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are about to delete <strong>{productIds.length}</strong> product{productIds.length === 1 ? "" : "s"}.
            </p>
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p className="font-semibold">How this works:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Products <strong>without order history</strong> will be permanently deleted</li>
                <li>Products <strong>with order history</strong> will be archived (hidden from customers, preserved for records)</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone for deleted products.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleBulkDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${productIds.length} Product${productIds.length === 1 ? "" : "s"}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
