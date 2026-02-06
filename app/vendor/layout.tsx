import Link from "next/link";
import { Settings, LogOut, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role || "USER";
  const isVendor = role === "VENDOR" || role === "ADMIN";

  const vendor = isVendor && session?.user?.id
    ? await prisma.vendor.findUnique({
        where: { userId: session.user.id },
        select: { name: true, email: true },
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border/50 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/vendor" className="font-bold text-xl">
                {vendor?.name || "InstaHealth Vendor Portal"}
              </Link>
              {vendor && (
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
              )}
            </div>
            <div className="flex items-center gap-4">
              {vendor?.email && (
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {vendor.email}
                </span>
              )}
              {session && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/api/auth/signout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {vendor && (
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
      )}

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
