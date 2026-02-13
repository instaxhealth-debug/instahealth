"use client";

import { useMemo, useState } from "react";
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
  const [logoError, setLogoError] = useState(false);

  const normalizedLogoUrl = useMemo(() => {
    const raw = typeof vendor.logoUrl === "string" ? vendor.logoUrl.trim() : "";
    if (!raw) return "";
    if (raw.startsWith("/public/")) return raw.replace(/^\/public/, "");
    return raw;
  }, [vendor.logoUrl]);

  const hasLogoUrl =
    normalizedLogoUrl.length > 0 &&
    (normalizedLogoUrl.startsWith("/") || normalizedLogoUrl.startsWith("http://") || normalizedLogoUrl.startsWith("https://"));

  if (process.env.NODE_ENV !== "production" && normalizedLogoUrl) {
    if (normalizedLogoUrl.includes("/vendors/bloodtestvendors/") || normalizedLogoUrl.includes("/public/vendors/bloodtestvendors/")) {
      console.warn("[VendorLogoWarning] seeded logo path detected", {
        vendorId: vendor.id,
        vendorName: vendor.name,
        logoUrl: normalizedLogoUrl,
      });
    }
  }

  const initials = useMemo(() => {
    const parts = vendor.name.trim().split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
    return letters.join("") || "?";
  }, [vendor.name]);

  return (
    <Link href={`/shop/${vendor.slug}/${category}`}>
      <div className={cn("w-full rounded-2xl border border-slate-200 shadow-sm bg-slate-50/70 p-4 hover:shadow-md transition-shadow", className)}>
      
      {/* Top Row: Logo + Badges */}
        <div className="flex items-center justify-between gap-3">
          <div className="h-20 w-48 flex items-center flex-shrink-0">
            {hasLogoUrl && !logoError ? (
              <Image
                src={normalizedLogoUrl}
                alt={vendor.name}
                width={220}
                height={80}
                className="h-20 w-auto object-contain"
                priority
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-lg font-semibold">
                {initials}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {productCount === 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md shadow-sm border border-amber-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Coming soon
              </div>
            )}
            {vendor.isHouseBrand && (
              <div className="flex items-center gap-1 text-xs text-slate-600 bg-white px-2 py-1 rounded-md shadow-sm">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Home Brand
              </div>
            )}
          </div>
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
