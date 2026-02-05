"use client";

import Link from "next/link";
import {
  User,
  MapPin,
  CreditCard,
  Coins,
  Database,
  Settings,
  ChevronRight,
} from "lucide-react";
import { AccountLogoutButton } from "./AccountLogoutButton";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  href?: string;
}

interface AccountSidebarProps {
  activeItem?: string;
}

export function AccountSidebar({ activeItem = "personal-details" }: AccountSidebarProps) {
  const menuItems: MenuItem[] = [
    {
      icon: User,
      title: "Personal Details",
      subtitle: "Name, email, mobile number",
      href: "/my-account/personal-details",
    },
    {
      icon: MapPin,
      title: "Delivery Addresses",
      subtitle: "Add, edit and delete addresses",
      href: "/my-account/delivery-addresses",
    },
    {
      icon: CreditCard,
      title: "Payment Details",
      subtitle: "Add, edit and delete payment methods",
      href: "/my-account/payments",
    },
    {
      icon: Coins,
      title: "Credits",
      subtitle: "View your credits",
      href: "/my-account/credits",
    },
    {
      icon: Database,
      title: "Personal Data",
      subtitle: "Manage your data options",
      href: "/my-account/personal-data",
    },
    {
      icon: Settings,
      title: "Settings",
      subtitle: "Language and preferences",
      href: "/my-account/settings",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My account</h1>
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const isActive = activeItem === item.href?.split("/").pop();
          const Icon = item.icon;

          const content = (
            <>
              {/* Left accent bar for active item */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-600 rounded-l-lg" />
              )}

              <div className="flex items-center gap-3 flex-1">
                <Icon className={`w-5 h-5 ${isActive ? "text-teal-600" : "text-gray-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isActive ? "text-gray-900" : "text-gray-700"}`}>
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </>
          );

          const className = `
            relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
            ${
              isActive
                ? "bg-teal-50 hover:bg-teal-100"
                : "hover:bg-gray-50"
            }
          `;

          return (
            <Link key={item.title} href={item.href || "#"} className={className}>
              {content}
            </Link>
          );
        })}
        
        {/* Logout button as separate component */}
        <AccountLogoutButton />
      </nav>
    </div>
  );
}
