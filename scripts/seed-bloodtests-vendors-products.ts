/**
 * Blood Tests Vendors & Products Seed Script
 * 
 * Upserts 3 vendors and 37 blood-test products.
 * All products: active=true, inStock=true, isGlobal=true, category="blood-tests"
 * 
 * This is Option 1: SAFE upsert (no deletes).
 * Use Option 2 if you want to soft-disable existing blood-tests products first.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// NEW BLOOD-TESTS VENDORS
const vendors = [
  {
    name: "Healthchecks360",
    slug: "healthchecks360",
    tagline: "Comprehensive diagnostic and preventive blood testing across the UAE",
    rating: 4.8,
    ratingCount: 350,
  },
  {
    name: "FirstResponse Healthcare",
    slug: "firstresponse-healthcare",
    tagline: "At-home and clinic healthcare services across the UAE",
    rating: 4.7,
    ratingCount: 250,
  },
  {
    name: "HealthOne Healthcare",
    slug: "healthone-healthcare",
    tagline: "Home & clinic wellness testing and IV drips across the UAE",
    rating: 4.7,
    ratingCount: 300,
  },
];

// PRODUCTS BY VENDOR
interface ProductInput {
  name: string;
  slug: string;
  priceAED: number;
  description?: string;
}

const healthchecks360Products: ProductInput[] = [
  { name: "Bio Well Man Executive Package", slug: "hc360-bio-well-man-executive-package", priceAED: 3100 },
  { name: "Bio Silver Package With Male Cancer Screening", slug: "hc360-bio-silver-male-cancer-screening", priceAED: 1900 },
  { name: "Bio Silver Package With Female Cancer Screening", slug: "hc360-bio-silver-female-cancer-screening", priceAED: 1900 },
  { name: "Female Cancer Screening with Whole Abdomen Ultrasound", slug: "hc360-female-cancer-screening-ultrasound", priceAED: 1200 },
  { name: "Steroid Check", slug: "hc360-steroid-check", priceAED: 1400 },
  { name: "Corporate Essential Screening", slug: "hc360-corporate-essential-screening", priceAED: 399 },
  { name: "Bio Well Woman Executive Package", slug: "hc360-bio-well-woman-executive-package", priceAED: 3600 },
  { name: "Corporate Basic Screening", slug: "hc360-corporate-basic-screening", priceAED: 450 },
  { name: "Corporate Silver Package", slug: "hc360-corporate-silver-package", priceAED: 600 },
  { name: "Corporate Gold Package", slug: "hc360-corporate-gold-package", priceAED: 900 },
  { name: "Corporate Platinum Plus - Male", slug: "hc360-corporate-platinum-plus-male", priceAED: 2500 },
  { name: "Corporate Platinum Plus - Female", slug: "hc360-corporate-platinum-plus-female", priceAED: 3150 },
];

const firstresponseProducts: ProductInput[] = [
  { name: "Immune Booster 250ml", slug: "frh-immune-booster-250ml", priceAED: 750 },
  { name: "Immune Booster 500ml", slug: "frh-immune-booster-500ml", priceAED: 899 },
  { name: "Multivitamins Drip", slug: "frh-multivitamins-drip", priceAED: 650 },
  { name: "Energy booster", slug: "frh-energy-booster", priceAED: 950 },
  { name: "NAD iv Drip 100mg", slug: "frh-nad-iv-drip-100mg", priceAED: 650 },
  { name: "NAD iv Drip 250mg", slug: "frh-nad-iv-drip-250mg", priceAED: 850 },
  { name: "Detox Drip", slug: "frh-detox-drip", priceAED: 850 },
  { name: "Vitamin C Drip 300mg", slug: "frh-vitamin-c-drip-300mg", priceAED: 550 },
  { name: "Vitamin C Drip 5000mg", slug: "frh-vitamin-c-drip-5000mg", priceAED: 650 },
  { name: "Vitamin C Drip 7500mg", slug: "frh-vitamin-c-drip-7500mg", priceAED: 750 },
  { name: "Glowing skin", slug: "frh-glowing-skin", priceAED: 950 },
  { name: "Hydartion Drip", slug: "frh-hydration-drip", priceAED: 650 },
  { name: "Glutathione Drip", slug: "frh-glutathione-drip", priceAED: 550 },
  { name: "HealthOne Special Drip", slug: "frh-healthone-special-drip", priceAED: 1899 },
];

const healthoneProducts: ProductInput[] = [
  { name: "Immune Booster", slug: "ho-immune-booster", priceAED: 599 },
  { name: "Multivitamins Drip", slug: "ho-multivitamins-drip", priceAED: 450 },
  { name: "Energy booster", slug: "ho-energy-booster", priceAED: 650 },
  { name: "NAD iv Drip 100mg", slug: "ho-nad-iv-drip-100mg", priceAED: 450 },
  { name: "NAD iv Drip 250mg", slug: "ho-nad-iv-drip-250mg", priceAED: 699 },
  { name: "Detox Drip", slug: "ho-detox-drip", priceAED: 650 },
  { name: "Vitamin C Drip", slug: "ho-vitamin-c-drip", priceAED: 499 },
  { name: "Glowing skin 600mg", slug: "ho-glowing-skin-600mg", priceAED: 499 },
  { name: "Glowing skin 1200mg", slug: "ho-glowing-skin-1200mg", priceAED: 899 },
  { name: "Hydartion Drip", slug: "ho-hydration-drip", priceAED: 399 },
  { name: "Glutathione Drip 600mg", slug: "ho-glutathione-drip-600mg", priceAED: 399 },
  { name: "Glutathione Drip 1200mg", slug: "ho-glutathione-drip-1200mg", priceAED: 750 },
  { name: "HealthOne Special Drip", slug: "ho-healthone-special-drip", priceAED: 1400 },
];

function aedToFils(aed: number): number {
  return aed * 100;
}

async function softDisableExistingProducts() {
  console.log("⚠️  SOFT-DISABLING all existing blood-tests products...");
  const result = await prisma.product.updateMany({
    where: {
      category: "blood-tests",
      active: true,
    },
    data: {
      active: false,
    },
  });
  console.log(`   ✅ Disabled ${result.count} existing products\n`);
}

async function main() {
  const option = process.env.SEED_OPTION || "1";
  console.log(`🔵 BLOOD TESTS VENDORS & PRODUCTS SEED - OPTION ${option}`);
  console.log("================================================\n");

  try {
    // OPTION 2: Soft-disable existing products first
    if (option === "2") {
      await softDisableExistingProducts();
    }

    // ========================================
    // STEP 1: UPSERT VENDORS
    // ========================================
    console.log("STEP 1: Upserting blood-tests vendors...");
    const vendorMap: Record<string, string> = {};

    for (const vendor of vendors) {
      const upserted = await prisma.vendor.upsert({
        where: { slug: vendor.slug },
        update: {
          name: vendor.name,
          status: "active",
          country: "AE",
          rating: vendor.rating,
          ratingCount: vendor.ratingCount,
          isHouseBrand: false,
          complianceAccepted: true,
          complianceAcceptedAt: new Date(),
        },
        create: {
          name: vendor.name,
          slug: vendor.slug,
          status: "active",
          country: "AE",
          rating: vendor.rating,
          ratingCount: vendor.ratingCount,
          isHouseBrand: false,
          complianceAccepted: true,
          complianceAcceptedAt: new Date(),
        },
      });
      vendorMap[vendor.slug] = upserted.id;
      console.log(`  ✅ ${vendor.name} (${vendor.slug})`);
    }
    console.log();

    // ========================================
    // STEP 2: UPSERT/CREATE PRODUCTS
    // ========================================
    console.log("STEP 2: Creating blood-tests products...");
    let productCount = 0;

    // Healthchecks360 products
    console.log("  📍 Healthchecks360 (12 products):");
    for (const product of healthchecks360Products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {
          name: product.name,
          category: "blood-tests",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
        },
        create: {
          name: product.name,
          slug: product.slug,
          category: "blood-tests",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
          vendorId: vendorMap["healthchecks360"],
          description: "Comprehensive blood test and health screening service",
        },
      });
      console.log(`    • ${product.name} - AED ${product.priceAED}`);
      productCount++;
    }

    // FirstResponse Healthcare products
    console.log("  📍 FirstResponse Healthcare (14 products):");
    for (const product of firstresponseProducts) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {
          name: product.name,
          category: "blood-tests",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
        },
        create: {
          name: product.name,
          slug: product.slug,
          category: "blood-tests",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
          vendorId: vendorMap["firstresponse-healthcare"],
          description: "Healthcare service - blood test and wellness drip",
        },
      });
      console.log(`    • ${product.name} - AED ${product.priceAED}`);
      productCount++;
    }

    // HealthOne Healthcare products
    console.log("  📍 HealthOne Healthcare (13 products):");
    for (const product of healthoneProducts) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {
          name: product.name,
          category: "blood-tests",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
        },
        create: {
          name: product.name,
          slug: product.slug,
          category: "blood-tests",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
          vendorId: vendorMap["healthone-healthcare"],
          description: "Healthcare service - blood test and wellness drip",
        },
      });
      console.log(`    • ${product.name} - AED ${product.priceAED}`);
      productCount++;
    }

    console.log(`\n✅ Created/updated ${productCount} blood-tests products\n`);

    // ========================================
    // VERIFICATION
    // ========================================
    console.log("VERIFICATION: Current state");
    console.log("============================");

    const activeBloodTestsProducts = await prisma.product.count({
      where: {
        category: "blood-tests",
        active: true,
      },
    });

    const newVendors = await prisma.vendor.findMany({
      where: {
        slug: {
          in: ["healthchecks360", "firstresponse-healthcare", "healthone-healthcare"],
        },
      },
      include: {
        products: {
          where: {
            category: "blood-tests",
            active: true,
          },
        },
      },
    });

    console.log(`✅ Total active blood-tests products: ${activeBloodTestsProducts}`);
    console.log(`✅ New vendors created/updated: ${newVendors.length}`);

    for (const vendor of newVendors) {
      console.log(`  • ${vendor.name}: ${vendor.products.length} active blood-tests products`);
    }

    console.log("\n🟢 BLOOD TESTS SEED COMPLETE");
    console.log("============================");
  } catch (error) {
    console.error("❌ ERROR:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
