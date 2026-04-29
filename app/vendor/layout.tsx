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
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Badge className="gap-2 px-3 py-1.5 text-xs font-semibold bg-[#41a59b]/10 text-[#41a59b] border border-[#41a59b]/30 rounded-lg">
                <Briefcase className="h-3.5 w-3.5" />
                VENDOR PORTAL
              </Badge>
              <Link href="/vendor" className="font-bold text-xl text-gray-900 hover:text-[#41a59b] transition-colors">
                {vendor.vendorName}
              </Link>
              <VendorNav />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden lg:inline">
                Logged in as: <span className="font-medium text-gray-900">{vendor.vendorName || vendor.vendorSlug}</span>
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-auto bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-600 text-center">
            InstaHealth Vendor Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
