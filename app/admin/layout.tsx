import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import type { ReactNode } from "react";

export const metadata = {
  title: "Admin",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/health", label: "Health" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/payouts", label: "Payouts" },
    { href: "/admin/vendors", label: "Vendors" },
    { href: "/admin/vendor-applications", label: "Vendor Applications" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/locations", label: "Locations" },
    { href: "/admin/users", label: "Users" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      <aside className="w-60 border-r bg-white p-4">
        <div className="font-bold text-lg mb-6">Admin</div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
