"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface HeaderNavItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  badge?: number;
  onClick?: () => void;
}

export function HeaderNavItem({ icon: Icon, label, href, badge, onClick }: HeaderNavItemProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <div className="flex flex-col items-center gap-[6px] min-w-[72px] cursor-pointer transition-all duration-200 group">
      <div className="relative">
        <Icon className="h-[22px] w-[22px] text-white group-hover:opacity-80 transition-colors duration-200" />
        {mounted && badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#41a59b]">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className="text-[14px] font-semibold text-white group-hover:opacity-80 transition-colors duration-200 leading-tight">{label}</span>
    </div>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick} 
        className="appearance-none bg-transparent border-none p-0 cursor-pointer"
        type="button"
      >
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
