"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Package, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Marketplace",
    href: "/",
    icon: Home,
  },
  {
    label: "My Orders",
    href: "/orders",
    icon: Package,
  },
  {
    label: "My Basket",
    href: "/cart",
    icon: ShoppingCart,
  },
  {
    label: "Account",
    href: "/account",
    icon: User,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-4 h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive
                  ? "text-[#41a59b]"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
