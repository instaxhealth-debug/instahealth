"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/vendor" },
  { label: "Orders", href: "/vendor/orders" },
  { label: "Bookings", href: "/vendor/bookings" },
  { label: "Products", href: "/vendor/products" },
  { label: "Settings", href: "/vendor/settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/vendor") {
    return pathname === "/vendor";
  }
  return pathname.startsWith(href);
}

export function VendorNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <nav className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm px-4 py-2 rounded-lg transition-all font-medium",
              isActive(pathname, item.href)
                ? "bg-[#41a59b] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="md:hidden">
        <label className="sr-only" htmlFor="vendor-manage-nav">
          Manage
        </label>
        <select
          id="vendor-manage-nav"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white font-medium text-gray-900"
          value={NAV_ITEMS.find((item) => isActive(pathname, item.href))?.href}
          onChange={(event) => router.push(event.target.value)}
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
