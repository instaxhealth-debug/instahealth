import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-4">Page not found</h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex gap-4">
            <Button asChild className="rounded-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go home
              </Link>
            </Button>
            <Button variant="outline" asChild className="rounded-full">
              <Link href="/marketplace/peptides">
                <Search className="h-4 w-4 mr-2" />
                Browse products
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
