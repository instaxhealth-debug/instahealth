import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface SkeletonCardProps {
  variant?: "product" | "service" | "test";
  className?: string;
}

export function SkeletonCard({ variant = "product", className }: SkeletonCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-0">
        <Skeleton className="aspect-square w-full rounded-t-xl" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-5 w-20" />
            {variant === "service" || variant === "test" ? (
              <Skeleton className="h-4 w-16" />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
