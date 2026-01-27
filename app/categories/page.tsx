import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { categories } from "@/data/categories";

export default function CategoriesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">All Categories</h1>
        <p className="text-muted-foreground">
          Browse our complete range of health and wellness services
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={category.marketplaceRoute}
            className="group"
          >
            <Card className="h-full p-6 flex flex-col items-center text-center transition-all duration-200 hover:shadow-lg hover:border-[#41a59b]/50 active:scale-95">
              {/* Icon */}
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-4 transition-transform duration-300 group-hover:scale-110">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80px, 96px"
                  priority={category.id === "peptides" || category.id === "iv-drips" || category.id === "blood-tests"}
                />
              </div>

              {/* Label */}
              <h3 className="text-lg md:text-xl font-bold mb-2 group-hover:text-[#41a59b] transition-colors">
                {category.name}
              </h3>

              {/* Description - hidden on mobile */}
              <p className="text-sm text-muted-foreground hidden md:block line-clamp-2">
                {category.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
