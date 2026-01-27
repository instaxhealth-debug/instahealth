import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getSelectedLocationId } from "@/lib/location";
import { CATEGORY_SLUGS } from "@/lib/utils/category";

export async function GET() {
  try {
    await requireAdmin();

    const selectedLocationId = await getSelectedLocationId();

    // Count active locations
    const activeLocations = await prisma.location.count({ where: { isActive: true } });

    // Count active vendors
    const activeVendors = await prisma.vendor.count({ where: { status: "active" } });

    // Count total products
    const totalProducts = await prisma.product.count();

    // Count peptides products matching visibility filters
    const peptidesProducts = await prisma.product.findMany({
      where: {
        category: "peptides",
        active: true,
        inStock: true,
        vendor: { status: "active" },
        OR: [
          { isGlobal: true },
          ...(selectedLocationId ? [{ locations: { some: { locationId: selectedLocationId } } }] : []),
        ],
      },
      include: { vendor: true },
    });

    // Count distinct vendors with matching peptides products
    const peptidesVendorIds = new Set(peptidesProducts.map((p) => p.vendorId));

    return Response.json({
      selectedLocationId: selectedLocationId || "not-set",
      activeLocationsCount: activeLocations,
      activeVendorsCount: activeVendors,
      totalProductsCount: totalProducts,
      peptidesProductsMatchingFiltersCount: peptidesProducts.length,
      peptidesVendorsMatchingFiltersCount: peptidesVendorIds.size,
      filterRules: {
        category: "peptides",
        productActive: true,
        productInStock: true,
        vendorStatus: "active",
        visibility: selectedLocationId
          ? `product.isGlobal=true OR product.locations.some(locationId="${selectedLocationId}")`
          : "product.isGlobal=true (no selectedLocationId)",
      },
      debugNote:
        "If peptidesVendorsMatchingFiltersCount=0, check: 1) Does a vendor have active peptides products? 2) Is the product assigned to the selected location or marked global? 3) Is the product active=true AND inStock=true?",
    });
  } catch (error) {
    return Response.json(
      { error: "Unauthorized or server error", details: String(error) },
      { status: 401 }
    );
  }
}
