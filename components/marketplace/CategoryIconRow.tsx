"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { slug: "blood-tests", label: "Blood Tests", icon: "/category-icons/blood-tests.png" },
  { slug: "peptides", label: "Peptides", icon: "/category-icons/peptides.png" },
  { slug: "iv-drips", label: "IV Drips", icon: "/category-icons/iv-drips.png" },
  { slug: "supplements", label: "Supplements", icon: "/category-icons/supplements.png" },
  { slug: "hormones", label: "Hormones", icon: "/category-icons/hormones.png" },
  { slug: "consultations", label: "Consultations", icon: "/category-icons/consultations.png" },
  { slug: "insurance", label: "Insurance", icon: "/category-icons/insurance.png" },
  { slug: "skincare", label: "Skincare", icon: "/category-icons/skincare.png" },
  { slug: "haircare", label: "Haircare", icon: "/category-icons/haircare.png" },
];

export function CategoryIconRow() {
  const params = useParams();
  const activeCategory = params?.category as string;

  return (
    <div className="overflow-x-auto flex gap-4 px-4 py-3 bg-white border-b scrollbar-hide lg:justify-center">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.slug;
        return (
          <Link
            key={cat.slug}
            href={`/marketplace/${cat.slug}`}
            className="flex-shrink-0 flex flex-col items-center gap-2"
          >
            <div
              className={cn(
                "relative rounded-full w-16 h-16 bg-white shadow-sm border overflow-hidden transition-all",
                isActive && "ring-2 ring-emerald-500 border-emerald-500"
              )}
            >
              <Image
                src={cat.icon}
                alt={cat.label}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <span className={cn("text-xs text-slate-600", isActive && "font-medium text-emerald-600")}>
              {cat.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
