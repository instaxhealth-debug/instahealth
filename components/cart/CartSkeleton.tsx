import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * CartSkeleton - Loading placeholder for cart page
 * Matches CartView layout structure for smooth loading transition
 */
export function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart Items Skeleton */}
      <div className="lg:col-span-2 space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Image Skeleton */}
                <Skeleton className="w-24 h-24 rounded-xl flex-shrink-0" />

                {/* Content Skeleton */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Product Name */}
                  <Skeleton className="h-5 w-3/4" />
                  {/* Price */}
                  <Skeleton className="h-4 w-20" />
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-28 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Summary Skeleton */}
      <div className="lg:col-span-1">
        <Card className="border-border/50 sticky top-4">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-11 w-full rounded-full mt-4" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
