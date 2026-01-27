"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <h2 className="text-2xl font-semibold">Something went wrong</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                We encountered an unexpected error. Please try again or return to the homepage.
              </p>
              <div className="flex gap-4">
                <Button onClick={reset} className="rounded-full">
                  Try again
                </Button>
                <Button variant="outline" asChild className="rounded-full">
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Go home
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
