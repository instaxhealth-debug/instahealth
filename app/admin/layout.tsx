import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Users,
  MapPin,
  DollarSign,
  FileText,
  Activity,
  Calendar,
} from "lucide-react";

export const metadata = {
  title: "Admin Control Center",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/bookings", label: "Bookings", icon: Calendar },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/vendors", label: "Vendors", icon: Store },
    { href: "/admin/vendor-applications", label: "Vendor Applications", icon: FileText },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/locations", label: "Locations", icon: MapPin },
    { href: "/admin/payouts", label: "Payouts", icon: DollarSign },
    { href: "/admin/health", label: "System Health", icon: Activity },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white shadow-sm">
        <div className="p-6 border-b">
          <h1 className="font-bold text-xl text-gray-900">Admin</h1>
          <p className="text-xs text-gray-500 mt-1">Control Center</p>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
