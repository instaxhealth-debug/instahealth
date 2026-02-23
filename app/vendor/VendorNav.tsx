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
      <nav className="hidden md:flex items-center gap-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm text-muted-foreground hover:text-foreground transition-colors",
              isActive(pathname, item.href) &&
                "text-foreground font-semibold border-b-2 border-primary pb-1"
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
          className="rounded border px-2 py-1 text-sm bg-background"
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
