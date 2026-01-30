/**
 * InstaBloodz Blood Tests Seed Script
 *
 * Idempotent: upserts InstaBloodz vendor + ensures at least one blood-tests product
 * Run: npx ts-node scripts/seed-instabloodz-bloodtests.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const vendorSlug = "instabloodz";

const vendorData = {
  name: "InstaBloodz",
  slug: vendorSlug,
  status: "active",
  country: "AE",
  tagline: "Everything Blood Tests",
  rating: 5.0,
  ratingCount: 500,
  isHouseBrand: true,
  logoUrl: "/vendors/Bloodtestvendors/bloodz.png",
  complianceAccepted: true,
  complianceAcceptedAt: new Date(),
};

const productData = {
  name: "InstaBloodz Core Blood Panel",
  slug: "instabloodz-core-blood-panel",
  description: "Blood test and wellness service",
  category: "blood-tests",
  priceFils: 19900,
  imageUrl: null as string | null,
  active: true,
  inStock: true,
  isGlobal: true,
};

async function main() {
  console.log("🔵 INSTABLOODZ BLOOD TESTS SEED - STARTING");
  console.log("=========================================\n");

  try {
    const vendor = await prisma.vendor.upsert({
      where: { slug: vendorSlug },
      update: {
        name: vendorData.name,
        status: vendorData.status,
        country: vendorData.country,
        tagline: vendorData.tagline,
        rating: vendorData.rating,
        ratingCount: vendorData.ratingCount,
        isHouseBrand: vendorData.isHouseBrand,
        logoUrl: vendorData.logoUrl,
        complianceAccepted: vendorData.complianceAccepted,
        complianceAcceptedAt: vendorData.complianceAcceptedAt,
      },
      create: vendorData,
    });

    console.log(`✅ Vendor upserted: ${vendor.name} (${vendor.slug})`);

    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        name: productData.name,
        description: productData.description,
        category: productData.category,
        priceFils: productData.priceFils,
        imageUrl: productData.imageUrl,
        active: true,
        inStock: true,
        isGlobal: true,
      },
      create: {
        ...productData,
        vendorId: vendor.id,
      },
    });

    console.log(`✅ Product upserted: ${product.name} (${product.slug})`);

    const vendorProductCount = await prisma.product.count({
      where: {
        vendorId: vendor.id,
        category: "blood-tests",
        active: true,
        inStock: true,
        OR: [{ isGlobal: true }],
      },
    });

    console.log(`✅ Active blood-tests products for ${vendor.slug}: ${vendorProductCount}`);
    console.log("\n🟢 INSTABLOODZ SEED COMPLETE");
    console.log("=========================================");
  } catch (error) {
    console.error("❌ ERROR:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
