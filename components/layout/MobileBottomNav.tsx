"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Package, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnhancedCart } from "@/hooks/use-enhanced-cart";

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
    href: "/my-account/personal-details",
    icon: User,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { getTotalItems } = useEnhancedCart();
  const cartItemCount = getTotalItems();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-4 h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const showBadge = item.icon === ShoppingCart && cartItemCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors relative",
                isActive
                  ? "text-[#41a59b]"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#41a59b] text-[9px] font-bold text-white">
                    {cartItemCount > 9 ? "9+" : cartItemCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
