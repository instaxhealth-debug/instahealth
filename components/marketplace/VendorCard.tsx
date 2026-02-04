"use client";

import Link from "next/link";
import { Star, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vendor } from "@/types/vendor";

interface VendorCardProps {
  vendor: Vendor;
  className?: string;
  showOfferingsCount?: boolean;
  offeringsCount?: number;
}

export function VendorCard({ vendor, className, showOfferingsCount, offeringsCount }: VendorCardProps) {
  const normalizeLogoUrl = (logoUrl?: string) => {
    if (!logoUrl) return undefined;
    let normalized = logoUrl.trim();

    if (normalized.startsWith("/public/")) {
      normalized = normalized.replace(/^\/public/, "");
    }

    if (!normalized.startsWith("/")) {
      normalized = `/${normalized}`;
    }

    normalized = normalized.replace(/\/vendors\/bloodtestvendors\//i, "/vendors/bloodtestvendors/");

    return normalized;
  };

  const instabloodzLogo = "/vendors/bloodtestvendors/bloodz.png";
  const vendorNameLower = vendor.name?.toLowerCase() || "";
  const vendorSlugLower = vendor.slug?.toLowerCase() || "";

  const normalizedLogo =
    vendorNameLower.includes("instabloodz") || vendorSlugLower.includes("instablood")
      ? instabloodzLogo
      : normalizeLogoUrl(vendor.logoUrl);

  if (process.env.NODE_ENV === "development" && vendor.logoUrl) {
    console.log("[VendorLogo]", vendor.name, { logoUrl: vendor.logoUrl, normalizedLogo });
  }

  return (
    <div className={cn(
      "bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 md:p-5",
      "hover:border-primary/30 hover:shadow-md transition-all",
      className
    )}>
      <div className="flex items-start justify-between gap-4 mb-3">
        {/* Logo */}
        {normalizedLogo && (
          <div className="flex-shrink-0">
            <div className="relative h-16 w-16 md:h-20 md:w-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={normalizedLogo}
                alt={`${vendor.name} logo`}
                width={20}
                height={20}
                className="h-full w-full object-contain bg-white"
                onError={() => {
                  console.warn("[VendorLogoError]", vendor.name, normalizedLogo);
                }}
              />
            </div>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/vendor/${vendor.slug}`}>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 hover:text-primary transition-colors">
                {vendor.name}
              </h3>
            </Link>
            {vendor.isVerified && (
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0"  />
            )}
          </div>
          
          {/* Trust signals - visually loud */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-3">
            {vendor.rating && (
              <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-200">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-bold text-gray-900">{vendor.rating}</span>
                {vendor.reviewCount && (
                  <span className="text-xs font-medium text-gray-600">({vendor.reviewCount})</span>
                )}
              </div>
            )}
            
            {vendor.availabilityText && (
              <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="font-bold text-green-700 text-sm">{vendor.availabilityText}</span>
              </div>
            )}
            
            {vendor.serviceAreas && vendor.serviceAreas.length > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-blue-700 text-sm">{vendor.serviceAreas.join(", ")}</span>
              </div>
            )}
          </div>

          {vendor.promo && (
            <div className="inline-flex items-center bg-primary/10 text-primary font-bold text-sm px-3 py-1.5 rounded-lg border border-primary/20">
              {vendor.promo.text}
            </div>
          )}
        </div>
      </div>
      
      {showOfferingsCount && offeringsCount !== undefined && (
        <div className="text-xs font-medium text-gray-500 mt-2">
          {offeringsCount} {offeringsCount === 1 ? "product" : "products"} available
        </div>
      )}
    </div>
  );
}
