import Link from "next/link";
import { Settings, LogOut, ShoppingBag, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getVendorContext } from "@/lib/vendor-auth";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vendor = await getVendorContext();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border/50 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Badge className="gap-2 px-3 py-1 text-xs bg-primary/10 text-primary border border-primary/30">
                <Briefcase className="h-3 w-3" />
                VENDOR PORTAL
              </Badge>
              <Link href="/vendor" className="font-bold text-xl">
                {vendor.vendorName}
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/vendor/orders"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Orders
                </Link>
                <Link
                  href="/vendor/settings"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden lg:inline">
                Logged in as: {vendor.vendorName || vendor.vendorSlug}
              </span>
              <Button size="sm" asChild>
                <Link href="/vendor">Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/api/auth/signout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-b border-border/50 bg-card">
        <div className="container mx-auto px-4 py-2 flex items-center gap-4">
          <Link
            href="/vendor/orders"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Orders
          </Link>
          <Link
            href="/vendor/settings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center">
            InstaHealth Vendor Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
