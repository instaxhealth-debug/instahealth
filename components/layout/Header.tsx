"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, ShoppingCart, User, Briefcase } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderNavItem } from "./HeaderNavItem";
import { useEnhancedCart } from "@/hooks/use-enhanced-cart";
import { useCartStore } from "@/lib/store/cart-store";
import type { LocationOption } from "@/lib/location";

interface HeaderProps {
  initialLocation: LocationOption | null;
  locations: LocationOption[];
}

export function Header({ initialLocation: _initialLocation, locations: _locations }: HeaderProps) {
  const { data: session } = useSession();
  const { getTotalItems } = useEnhancedCart();
  const pathname = usePathname();

  const isVendor = session?.user?.role === "VENDOR";
  const isAdminRoute = pathname?.startsWith("/admin");
  
  // Subscribe directly to Zustand cart state for real-time updates
  const localCartItems = useCartStore((state) => state.items);
  
  // Compute total items whenever cart or session changes
  const totalItems = getTotalItems();

  if (isAdminRoute) {
    return (
      <header className="sticky top-0 z-50 w-full hidden md:block">
        <div className="w-full bg-[#41a59b] h-24">
          <div className="mx-auto w-full max-w-[1600px] px-2 lg:px-6 h-full">
            <div className="flex items-center justify-end h-full">
              <Link
                href="/admin"
                className="text-white text-[14px] font-semibold hover:opacity-80 transition-colors"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full hidden md:block">
      {/* Row A: Main Header Bar */}
      <div className="w-full bg-[#41a59b] h-24">
        <div className="mx-auto w-full max-w-[1600px] px-2 lg:px-6 h-full">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center h-full gap-2 lg:gap-3">
            {/* LEFT CLUSTER: Logo + Search + Location */}
              <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
              <Link href="/" className="flex items-center h-14 flex-shrink-0">
                <Logo type="instahealth" width={220} height={44} priority />
              </Link>
              <div className="flex-1 min-w-0 max-w-full lg:flex-none lg:w-[560px] xl:w-[640px]">
                <HeaderSearch />
              </div>
            </div>

            {/* SPACER */}
            <div className="flex-1 min-w-4" />

            {/* RIGHT CLUSTER: Nav Icons (ordered left-to-right) */}
            <div className="flex items-center justify-end gap-4 xl:gap-5 flex-shrink-0">
              {isVendor ? (
                <HeaderNavItem
                  icon={Briefcase}
                  label="Vendor Dashboard"
                  href="/vendor"
                />
              ) : (
                <>
                  {/* 1. Account (logged in) or Login (logged out) */}
                  {session ? (
                    <HeaderNavItem
                      icon={User}
                      label="Account"
                      href="/my-account/personal-details"
                    />
                  ) : (
                    <HeaderNavItem
                      icon={User}
                      label="Login"
                      href="/login"
                    />
                  )}
                  {/* 2. My Basket */}
                  <HeaderNavItem
                    icon={ShoppingCart}
                    label="My Basket"
                    href="/cart"
                    badge={totalItems}
                  />
                  {/* 3. My Orders */}
                  <HeaderNavItem
                    icon={ClipboardList}
                    label="My Orders"
                    href="/orders"
                  />
                  {/* 4. Marketplace */}
                  <HeaderNavItem
                    icon={Home}
                    label="Marketplace"
                    href="/marketplace"
                  />
                </>
              )}
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between h-full gap-2 px-2">
            <Link href="/" className="flex items-center flex-shrink-0 h-full">
              <Logo type="instahealth" width={180} height={40} priority />
            </Link>
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 max-w-full">
                <HeaderSearch />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isVendor ? (
                <HeaderNavItem
                  icon={Briefcase}
                  label="Dashboard"
                  href="/vendor"
                />
              ) : (
                <>
                  <HeaderNavItem
                    icon={ShoppingCart}
                    label="Cart"
                    href="/cart"
                    badge={totalItems}
                  />
                  {session ? (
                    <HeaderNavItem
                      icon={User}
                      label="Account"
                      href="/my-account/personal-details"
                    />
                  ) : (
                    <HeaderNavItem
                      icon={User}
                      label="Login"
                      href="/login"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
