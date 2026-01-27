"use client";

import Link from "next/link";
import Image from "next/image";
import { categories } from "@/data/categories";

export function CategoryCarousel() {
  return (
    <div className="w-full">
      {/* Mobile: Grid (3 columns), Desktop: Horizontal scroll */}
      <div className="grid grid-cols-3 gap-4 md:flex md:gap-5 lg:gap-6 md:overflow-x-auto md:scrollbar-hide md:pb-2 md:snap-x md:snap-mandatory md:-mx-4 md:px-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={category.marketplaceRoute}
            className="md:flex-shrink-0 md:snap-start group cursor-pointer flex flex-col items-center active:scale-95"
          >
            {/* Circular Image */}
            <div className="relative w-[90px] h-[90px] md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden transition-transform duration-300 group-hover:scale-105">
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 90px, (max-width: 1024px) 112px, 128px"
                priority={category.id === "peptides" || category.id === "iv-drips" || category.id === "blood-tests"}
              />
            </div>
            
            {/* Label Below */}
            <span className="mt-3 text-sm md:text-sm font-semibold text-gray-900 text-center line-clamp-2 md:whitespace-nowrap">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
