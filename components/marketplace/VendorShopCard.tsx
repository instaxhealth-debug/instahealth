"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorShopCardProps {
  vendor: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    tagline?: string | null;
    rating?: number | null;
    ratingCount?: number | null;
    isHouseBrand?: boolean;
  };
  category: string;
  productCount: number;
  minPriceFils: number;
  sampleImages?: (string | null)[];
  className?: string;
}

export function VendorShopCard({
  vendor,
  category,
  productCount,
  minPriceFils,
  sampleImages = [],
  className,
}: VendorShopCardProps) {
  return (
    <Link href={`/shop/${vendor.slug}/${category}`}>
      <div className={cn("w-full rounded-2xl border border-slate-200 shadow-sm bg-slate-50/70 p-4 hover:shadow-md transition-shadow", className)}>
      
      {/* Top Row: Logo + Home Brand Badge */}
        <div className="flex items-center justify-between gap-3">
          <Image
            src={vendor.logoUrl ?? "/logos/vendor-fallback.png"}
            alt={vendor.name}
            width={220}
            height={80}
            className="h-20 w-auto object-contain"
            priority
          />
          {vendor.isHouseBrand && (
            <div className="flex items-center gap-1 text-xs text-slate-600 bg-white px-2 py-1 rounded-md shadow-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Home Brand
            </div>
          )}
        </div>

        {/* Bottom Row: Name/Tagline + Rating */}
        <div className="flex items-end justify-between mt-3">
          {/* Left: Name + Tagline */}
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-semibold text-slate-900">
              {vendor.name}
            </h3>
            <p className="text-sm text-sky-600">
              {vendor.tagline || "Premium Products"}
            </p>
          </div>

          {/* Right: Rating */}
          {vendor.rating && (
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="font-semibold text-slate-900">
                {vendor.rating.toFixed(1)}
              </span>
              {vendor.ratingCount && (
                <span className="text-slate-600">
                  ({vendor.ratingCount >= 500 ? "500+" : vendor.ratingCount})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
