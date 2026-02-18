import { OfferingCard } from "@/components/marketplace/OfferingCard";
import { prisma } from "@/lib/prisma";
import { getSelectedLocationId } from "@/lib/location";
import type { Offering } from "@/types/offering";
import { isServiceCategory } from "@/lib/vendor-categories";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

export const revalidate = 0;

// Map URL slugs to canonical DB category slugs (exact match only)
const categoryMap: Record<string, string> = {
  "blood-tests": "blood-tests",
  "iv-drips": "iv-drips",
  clinics: "clinics",
  supplements: "supplements",
  peptides: "peptides",
  hormones: "hormones",
  consultations: "consultations",
  insurance: "insurance",
  skincare: "skincare",
  haircare: "haircare",
};

function prismaProductToOffering(product: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  priceFils: number;
  imageUrl: string | null;
  inStock: boolean;
  active: boolean;
  bookingUrl: string | null;
  vendor: {
    id: string;
    name: string;
  };
}): Offering {
  const isService = isServiceCategory(product.category);
  return {
    id: product.id,
    vendorId: product.vendor.id,
    type: isService ? "service" : "product",
    name: product.name,
    shortDescription: product.description || "",
    price: product.priceFils / 100,
    currency: "AED",
    stockStatus: isService ? undefined : product.inStock ? "in_stock" : "out_of_stock",
    image: product.imageUrl || undefined,
    slug: product.slug,
    bookingUrl: product.bookingUrl || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export default async function MarketplaceVendorPage({
  params,
}: {
  params: { category: string; vendor: string };
}) {
  noStore(); // Prevent caching during dev

  const categorySlug = params.category;
  const vendorId = params.vendor;
  const canonicalCategory = categoryMap[categorySlug];

  if (!canonicalCategory) {
    notFound();
  }

  // First verify vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, name: true, phone: true, status: true },
  });

  if (!vendor || vendor.status !== "active") {
    notFound();
  }

  // Get selected location from cookie/user/fallback
  const selectedLocationId = await getSelectedLocationId();

  const isService = isServiceCategory(canonicalCategory);

  // Products are shown if:
  // 1) isGlobal = true (explicitly marked as available everywhere)
  // 2) ProductLocation row matches selected location
  const products = await prisma.product.findMany({
    where: {
      active: true,
      published: true,
      ...(isService ? {} : { inStock: true }),
      vendorId: vendorId,
      category: canonicalCategory, // Exact canonical slug match
      OR: [
        { isGlobal: true },
        ...(selectedLocationId
          ? [{ locations: { some: { locationId: selectedLocationId } } }]
          : []),
      ],
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
      locations: {
        include: {
          location: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const offerings = products.map(prismaProductToOffering);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          {vendor.name} - {categorySlug.replace("-", " ")}
        </h1>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            {offerings.length} product{offerings.length !== 1 ? "s" : ""} available
          </p>
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone.replace(/\s+/g, "")}`}
              className="text-sm text-[#41a59b] hover:underline font-medium"
            >
              📞 {vendor.phone}
            </a>
          )}
        </div>
      </div>

      {offerings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No products found for this vendor in this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {offerings.map((product) => (
            <OfferingCard key={product.id} offering={product} />
          ))}
        </div>
      )}
    </div>
  );
}
