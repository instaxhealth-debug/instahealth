/**
 * IV Drips Complete Replacement Seed Script
 * 
 * This script performs a COMPLETE REPLACEMENT of the IV Drips section:
 * 1. Soft-disables (sets active=false) all existing IV drip products
 * 2. Upserts 5 new curated vendors
 * 3. Inserts all new IV drip products from provided specifications
 * 
 * WARNING: This is destructive. Only run after explicit approval.
 * All actions use active=false first (soft-disable), NOT hard delete.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// NEW IV DRIP VENDORS (to replace existing ones)
const newVendors = [
  {
    name: "Skin111 Aesthetics",
    slug: "skin111",
    category: "iv-drips",
    status: "active",
    country: "AE",
    rating: 4.8,
    isHouseBrand: false,
    complianceAccepted: true,
    url: "https://contact.skin111.com/aesthetics",
  },
  {
    name: "Prisma Aesthetics Clinic",
    slug: "prisma-aesthetics",
    category: "iv-drips",
    status: "active",
    country: "AE",
    rating: 4.9,
    isHouseBrand: false,
    complianceAccepted: true,
    url: "https://www.prismaestheticsclinic.com/",
  },
  {
    name: "Wellth",
    slug: "wellth",
    category: "iv-drips",
    status: "active",
    country: "AE",
    rating: 4.7,
    isHouseBrand: false,
    complianceAccepted: true,
    url: "https://wellth.ae/",
  },
  {
    name: "DripHub",
    slug: "driphub",
    category: "iv-drips",
    status: "active",
    country: "AE",
    rating: 4.8,
    isHouseBrand: false,
    complianceAccepted: true,
    url: "https://driphub.ae/",
  },
  {
    name: "Nightingale Dubai",
    slug: "nightingale",
    category: "iv-drips",
    status: "active",
    country: "AE",
    rating: 4.6,
    isHouseBrand: false,
    complianceAccepted: true,
    url: "https://www.nightingaledubai.com/",
  },
];

// NEW IV DRIP PRODUCTS
// DripHub Signature IV Drips
const dripHubSignature = [
  { name: "NAD+ Signature Booster™", priceAED: 799 },
  { name: "Iron Signature Booster™", priceAED: 799 },
  { name: "Vitamin C Signature Booster™", priceAED: 499 },
  { name: "C + Zinc Signature Booster™", priceAED: 599 },
  { name: "B-Complex Signature Booster™", priceAED: 499 },
  { name: "Glutathione Signature Booster™", priceAED: 499 },
  { name: "Gluta-C Signature Booster™", priceAED: 799 },
  { name: "NAC (N-Acetyl Cysteine) Signature Booster™", priceAED: 699 },
  { name: "Myers Signature Booster™", priceAED: 899 },
  { name: "Methylene Blue Signature Booster™", priceAED: 1299 },
];

// DripHub Elite IV Drips
const dripHubElite = [
  { name: "The Royal NAD+ Infusion™", priceAED: 1999 },
  { name: "The Royal Cleanse Infusion™", priceAED: 1999 },
  { name: "The Royal Party Prep Infusion™", priceAED: 1999 },
  { name: "The Ultimate Hangover Recovery Drip™", priceAED: 1399 },
  { name: "The Ultimate Energy Drip™", priceAED: 1299 },
  { name: "The Ultimate Immunity Drip™", priceAED: 1299 },
  { name: "The Ultimate Recovery Drip™", priceAED: 1299 },
  { name: "The Ultimate Hydration Drip™", priceAED: 1299 },
  { name: "The Ultimate Reset Drip™", priceAED: 1299 },
  { name: "The Ultimate Skin Glow Drip™", priceAED: 1299 },
  { name: "The Ultimate Hair Repair Drip™", priceAED: 1299 },
  { name: "The Ultimate Jet Lag Recovery Drip™", priceAED: 1299 },
  { name: "The Ultimate Sleep Reset Drip™", priceAED: 1299 },
];

// DripHub Mini IV Drips
const dripHubMini = [
  { name: "Hydration MiniBoost™", priceAED: 499 },
  { name: "Energy MiniBoost™", priceAED: 599 },
  { name: "Immune MiniBoost™", priceAED: 599 },
  { name: "Recovery MiniBoost™", priceAED: 599 },
  { name: "Hangover MiniFix™", priceAED: 699 },
  { name: "Skin Glow MiniBoost™", priceAED: 699 },
];

// Helper: Generate slug from product name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/™/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

// Helper: Convert AED to Fils
function aedToFils(aed: number): number {
  return aed * 100;
}

async function main() {
  console.log("🔵 IV DRIPS REPLACEMENT SEED - STARTING");
  console.log("==========================================\n");

  try {
    // ========================================
    // STEP 1: SOFT-DISABLE ALL EXISTING IV PRODUCTS
    // ========================================
    console.log("STEP 1: Soft-disabling existing IV drip products...");
    const disableResult = await prisma.product.updateMany({
      where: {
        category: "iv-drips",
        active: true,
      },
      data: {
        active: false,
      },
    });
    console.log(`✅ Soft-disabled ${disableResult.count} existing IV products\n`);

    // ========================================
    // STEP 2: UPSERT NEW VENDORS
    // ========================================
    console.log("STEP 2: Upserting new IV drip vendors...");
    const vendorMap: Record<string, string> = {};

    for (const vendor of newVendors) {
      const upserted = await prisma.vendor.upsert({
        where: { slug: vendor.slug },
        update: {
          name: vendor.name,
          status: vendor.status,
          country: vendor.country,
          rating: vendor.rating,
          isHouseBrand: vendor.isHouseBrand,
          complianceAccepted: vendor.complianceAccepted,
          complianceAcceptedAt: new Date(),
        },
        create: {
          name: vendor.name,
          slug: vendor.slug,
          status: vendor.status,
          country: vendor.country,
          rating: vendor.rating,
          isHouseBrand: vendor.isHouseBrand,
          complianceAccepted: vendor.complianceAccepted,
          complianceAcceptedAt: new Date(),
        },
      });
      vendorMap[vendor.slug] = upserted.id;
      console.log(`  ✅ ${vendor.name} (${vendor.slug})`);
    }
    console.log();

    // ========================================
    // STEP 3: INSERT NEW PRODUCTS (DripHub)
    // ========================================
    console.log("STEP 3: Creating DripHub IV drip products...");
    const dripHubVendorId = vendorMap["driphub"];
    let productCount = 0;

    // Signature Drips
    console.log("  📍 Signature IV Drips:");
    for (const product of dripHubSignature) {
      const slug = generateSlug(product.name);
      await prisma.product.upsert({
        where: { slug },
        update: {
          name: product.name,
          category: "iv-drips",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
        },
        create: {
          name: product.name,
          slug,
          category: "iv-drips",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
          vendorId: dripHubVendorId,
        },
      });
      console.log(
        `    • ${product.name} - AED ${product.priceAED}`
      );
      productCount++;
    }

    // Elite Drips
    console.log("  📍 Elite IV Drips:");
    for (const product of dripHubElite) {
      const slug = generateSlug(product.name);
      await prisma.product.upsert({
        where: { slug },
        update: {
          name: product.name,
          category: "iv-drips",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
        },
        create: {
          name: product.name,
          slug,
          category: "iv-drips",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
          vendorId: dripHubVendorId,
        },
      });
      console.log(
        `    • ${product.name} - AED ${product.priceAED}`
      );
      productCount++;
    }

    // Mini Drips
    console.log("  📍 Mini IV Drips:");
    for (const product of dripHubMini) {
      const slug = generateSlug(product.name);
      await prisma.product.upsert({
        where: { slug },
        update: {
          name: product.name,
          category: "iv-drips",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
        },
        create: {
          name: product.name,
          slug,
          category: "iv-drips",
          priceFils: aedToFils(product.priceAED),
          active: true,
          inStock: true,
          isGlobal: true,
          vendorId: dripHubVendorId,
        },
      });
      console.log(
        `    • ${product.name} - AED ${product.priceAED}`
      );
      productCount++;
    }
    console.log(`\n✅ Created ${productCount} DripHub products\n`);

    // ========================================
    // VERIFICATION
    // ========================================
    console.log("VERIFICATION: Current state");
    console.log("============================");

    const activeIVProducts = await prisma.product.count({
      where: {
        category: "iv-drips",
        active: true,
      },
    });

    const activeIVVendors = await prisma.vendor.findMany({
      where: {
        slug: {
          in: ["skin111", "prisma-aesthetics", "wellth", "driphub", "nightingale"],
        },
      },
      include: {
        products: {
          where: {
            category: "iv-drips",
            active: true,
          },
        },
      },
    });

    console.log(`✅ Total active IV products: ${activeIVProducts}`);
    console.log(`✅ New vendors created/updated: ${activeIVVendors.length}`);

    for (const vendor of activeIVVendors) {
      console.log(
        `  • ${vendor.name}: ${vendor.products.length} active products`
      );
    }

    console.log("\n🟢 IV DRIPS REPLACEMENT COMPLETE");
    console.log("==========================================");
  } catch (error) {
    console.error("❌ ERROR:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
