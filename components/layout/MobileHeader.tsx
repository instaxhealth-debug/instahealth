"use client";

import { HeaderSearch } from "./HeaderSearch";
import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { useSession } from "next-auth/react";

interface MobileHeaderProps {
  initialLocation: unknown;
  locations: unknown;
}

export function MobileHeader({ initialLocation: _initialLocation, locations: _locations }: MobileHeaderProps) {
  const { data: session } = useSession();
  
  return (
    <div className="md:hidden">
      {/* Teal header: logo + account + search */}
      <div className="bg-[#41a59b] border-b border-[#41a59b]/15 px-4 pt-4 pb-4 relative">
        <Link
          href={session ? "/my-account/personal-details" : "/login"}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label={session ? "Account" : "Login"}
        >
          <User className="h-6 w-6 text-white" />
        </Link>

        <div className="flex flex-col items-center gap-3">
          {/* Brand-first logo (larger) */}
          <Link href="/" className="flex items-center justify-center" aria-label="Home">
            <Image
              src="/instahealth.png"
              alt="InstaHealth"
              width={200}
              height={60}
              className="h-[56px] w-auto"
              priority
            />
          </Link>

          {/* Search bar */}
          <div className="w-full">
            <HeaderSearch isMobile />
          </div>
        </div>
      </div>
    </div>
  );
}
