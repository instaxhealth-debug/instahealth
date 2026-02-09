import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";

const prisma = new PrismaClient();

const CANONICAL_CATEGORIES = new Set([
  "peptides",
  "supplements",
  "physical-products",
  "doctor_consultation",
  "iv_drips",
  "blood_tests",
  "clinics",
]);

const HOUSE_BRAND_CATEGORIES = [
  "peptides",
  "supplements",
  "physical-products",
  "doctor_consultation",
  "iv_drips",
  "blood_tests",
  "clinics",
];

const SERVICE_CATEGORY_TO_PERMISSION: Record<string, string> = {
  consultations: "doctor_consultation",
  "iv-drips": "iv_drips",
  "blood-tests": "blood_tests",
  clinics: "clinics",
};

async function main() {
  const require = createRequire(import.meta.url);
  const { normalizeCategory } = require("../lib/vendor-categories") as {
    normalizeCategory: (value: string) => string;
  };
  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      name: true,
      isHouseBrand: true,
      allowedCategories: true,
      products: { select: { category: true } },
    },
  });

  let updatedVendors = 0;
  let houseBrandUpdates = 0;
  let inferredUpdates = 0;
  let emptyCategoryVendors = 0;

  for (const vendor of vendors) {
    if (vendor.isHouseBrand) {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { allowedCategories: HOUSE_BRAND_CATEGORIES },
      });
      updatedVendors += 1;
      houseBrandUpdates += 1;
      continue;
    }

    if (vendor.allowedCategories && vendor.allowedCategories.length > 0) {
      continue;
    }

    const normalized = vendor.products
      .map((product: { category: string }) => normalizeCategory(product.category))
      .map((category: string) => SERVICE_CATEGORY_TO_PERMISSION[category] || category)
      .filter((category: string) => CANONICAL_CATEGORIES.has(category));

    const uniqueCategories = Array.from(new Set(normalized));

    if (uniqueCategories.length === 0) {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { allowedCategories: [] },
      });
      emptyCategoryVendors += 1;
      updatedVendors += 1;
      console.log(`[BACKFILL] Vendor requires review: ${vendor.id} (${vendor.name})`);
      continue;
    }

    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { allowedCategories: uniqueCategories },
    });
    updatedVendors += 1;
    inferredUpdates += 1;
  }

  console.log("\nBackfill summary:");
  console.log(`- total vendors: ${vendors.length}`);
  console.log(`- updated vendors: ${updatedVendors}`);
  console.log(`- house brand updates: ${houseBrandUpdates}`);
  console.log(`- inferred updates: ${inferredUpdates}`);
  console.log(`- empty-category vendors: ${emptyCategoryVendors}`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
