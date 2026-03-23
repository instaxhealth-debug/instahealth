import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getVendorContext } from "@/lib/vendor-auth";
import { VendorNav } from "./VendorNav";
import { SignOutButton } from "./SignOutButton";
import { headers } from "next/headers";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = headers();
  const isPublicRoute = requestHeaders.get("x-public-route") === "1";

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const vendor = await getVendorContext();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border/50 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Badge className="gap-2 px-3 py-1 text-xs bg-primary/10 text-primary border border-primary/30">
                <Briefcase className="h-3 w-3" />
                VENDOR PORTAL
              </Badge>
              <Link href="/vendor" className="font-bold text-xl">
                {vendor.vendorName}
              </Link>
              <VendorNav />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden lg:inline">
                Logged in as: {vendor.vendorName || vendor.vendorSlug}
              </span>
              <Button size="sm" asChild>
                <Link href="/vendor">Dashboard</Link>
              </Button>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-muted-foreground text-center">
            InstaHealth Vendor Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
