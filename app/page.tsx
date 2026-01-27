import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { PromoBanner } from "@/components/home/PromoBanner";
import { AvailableNow } from "@/components/home/AvailableNow";
import { PopularNow } from "@/components/home/PopularNow";
import { MostBooked } from "@/components/home/MostBooked";
import { FeaturedSection } from "@/components/home/FeaturedSection";
import { getProductsFromPrisma } from "@/lib/api/products";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export default async function HomePage() {
  // Fetch products server-side
  const products = await getProductsFromPrisma();

  return (
    <div className="flex flex-col">
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-8 md:space-y-10">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">Shop by Category</h2>
            <Link 
              href="/categories" 
              className="text-sm text-[#41a59b] flex items-center gap-1 font-medium hover:underline"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <CategoryCarousel />
        </div>
        <PromoBanner />
        <AvailableNow />
        <PopularNow products={products} />
        <MostBooked />
        <FeaturedSection products={products.slice(0, 4)} />
      </div>
    </div>
  );
}
