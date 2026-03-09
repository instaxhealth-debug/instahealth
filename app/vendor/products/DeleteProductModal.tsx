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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteProductModalProps {
  productId: string;
  productName: string;
  trigger?: React.ReactNode;
  onDeleteSuccess?: () => void;
  redirectAfterDelete?: boolean;
}

export function DeleteProductModal({
  productId,
  productName,
  trigger,
  onDeleteSuccess,
  redirectAfterDelete = true,
}: DeleteProductModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/vendor/products/${productId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete product");
      }

      const action = data.action; // "archived" or "deleted"

      if (action === "archived") {
        toast({
          title: "Product Archived",
          description: "Product archived because it has order history. It is now hidden from customers.",
        });
      } else {
        toast({
          title: "Product Deleted",
          description: "Product has been permanently deleted.",
        });
      }

      setOpen(false);

      // Call success callback if provided
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }

      // Redirect to products list if requested
      if (redirectAfterDelete) {
        router.push("/vendor/products");
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("[DELETE_PRODUCT] Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are about to delete: <strong>{productName}</strong>
            </p>
            <div className="bg-muted p-3 rounded-md text-sm space-y-2">
              <p className="font-semibold">What happens next:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  If this product has <strong>no order history</strong>, it will be{" "}
                  <strong>permanently deleted</strong> (including images and variants).
                </li>
                <li>
                  If this product has <strong>order history</strong>, it will be{" "}
                  <strong>archived</strong> instead (hidden from customers but preserved for records).
                </li>
              </ul>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              This action cannot be undone for products with no order history.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Product
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
