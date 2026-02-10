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
  // Strict logo resolution with vendor name/slug matching
  const resolveLogoUrl = (vendor: VendorShopCardProps["vendor"]): string => {
    const instabloodzLogo = "/vendors/bloodtestvendors/bloodz.png";

    const vendorNameLower = vendor.name.toLowerCase();
    const vendorSlugLower = vendor.slug.toLowerCase();
    const vendorIdLower = vendor.id.toLowerCase();

    // Force InstaBloodz logo override (exact path, no fallback)
    if (
      vendorNameLower.includes("instabloodz") ||
      vendorSlugLower.includes("instablood") ||
      vendorIdLower.includes("instablood")
    ) {
      return instabloodzLogo;
    }

    // Step 1: If logoUrl exists and starts with "/", use it directly
    if (vendor.logoUrl && typeof vendor.logoUrl === "string" && vendor.logoUrl.startsWith("/")) {
      return vendor.logoUrl;
    }

    // Step 2: Match vendor by name or slug (case-insensitive)
    // Blood test vendor mapping
    if (
      vendorNameLower.includes("healthchecks360") ||
      vendorSlugLower.includes("healthchecks")
    ) {
      return "/vendors/bloodtestvendors/healthchecks360.png";
    }

    if (
      vendorNameLower.includes("healthone") ||
      vendorSlugLower.includes("healthone")
    ) {
      return "/vendors/bloodtestvendors/healthone-healthcare.png";
    }

    if (
      vendorNameLower.includes("firstresponse") ||
      vendorSlugLower.includes("firstresponse")
    ) {
      return "/vendors/bloodtestvendors/firstresponse-healthcare.png";
    }

    if (
      vendorNameLower.includes("mydoctor") ||
      vendorSlugLower.includes("mydoctor")
    ) {
      return "/vendors/bloodtestvendors/mydoctor-healthcare.png";
    }

    // Step 3: Fallback to fallback image only as last resort
    return "/logos/vendor-fallback.png";
  };

  const resolvedLogoSrc = resolveLogoUrl(vendor);

  // Hard debug logging (always in development)
  if (typeof window !== "undefined") {
    console.log("[VendorLogo]", {
      vendor: vendor.name,
      slug: vendor.slug,
      id: vendor.id,
      logoUrl: vendor.logoUrl,
      resolvedLogoSrc,
    });
  }

  return (
    <Link href={`/shop/${vendor.slug}/${category}`}>
      <div className={cn("w-full rounded-2xl border border-slate-200 shadow-sm bg-slate-50/70 p-4 hover:shadow-md transition-shadow", className)}>
      
      {/* Top Row: Logo + Badges */}
        <div className="flex items-center justify-between gap-3">
          <div className="h-20 w-48 flex items-center flex-shrink-0">
            <Image
              src={resolvedLogoSrc}
              alt={vendor.name}
              width={220}
              height={80}
              className="h-20 w-auto object-contain"
              priority
              onError={() => {
                console.warn("[VendorLogoError]", vendor.name, resolvedLogoSrc, "falling back to generic fallback");
              }}
            />
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
