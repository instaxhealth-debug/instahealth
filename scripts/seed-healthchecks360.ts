import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Healthchecks360 vendor and products seeding...");

  // Check if vendor already exists
  const existingVendor = await prisma.vendor.findFirst({
    where: {
      OR: [
        { slug: "healthchecks360" },
        { name: "Healthchecks360" }
      ]
    }
  });

  let vendor;
  if (existingVendor) {
    console.log("✓ Healthchecks360 vendor already exists:", existingVendor.id);
    vendor = existingVendor;
  } else {
    vendor = await prisma.vendor.create({
      data: {
        name: "Healthchecks360",
        slug: "healthchecks360",
        email: "info@healthchecks360.com",
        status: "active",
        logoUrl: null,
        tagline: "Comprehensive diagnostic and preventive blood testing across the UAE",
        rating: 4.8,
        ratingCount: 350,
        isHouseBrand: false,
        legalEntityName: "Healthchecks360 LLC",
        country: "AE",
        complianceAccepted: true,
        complianceAcceptedAt: new Date()
      }
    });
    console.log("✓ Created Healthchecks360 vendor:", vendor.id);
  }

  // Products to add (prices in AED converted to fils: 1 AED = 100 fils)
  const products = [
    {
      name: "Bio Well Man Executive Package",
      slug: "hc360-bio-well-man-exec",
      description: "Comprehensive executive health screening package designed for men, including detailed blood work, cancer markers, and cardiovascular assessment.",
      priceFils: 310000, // AED 3100
      category: "blood-tests"
    },
    {
      name: "Bio Silver Package With Male Cancer Screening",
      slug: "hc360-bio-silver-male",
      description: "Preventive health package with comprehensive blood tests and male-specific cancer screening markers.",
      priceFils: 190000, // AED 1900
      category: "blood-tests"
    },
    {
      name: "Bio Silver Package With Female Cancer Screening",
      slug: "hc360-bio-silver-female",
      description: "Preventive health package with comprehensive blood tests and female-specific cancer screening markers.",
      priceFils: 190000, // AED 1900
      category: "blood-tests"
    },
    {
      name: "Female Cancer Screening with Whole Abdomen Ultrasound",
      slug: "hc360-female-cancer-ultrasound",
      description: "Specialized cancer screening package for women including blood markers and whole abdomen ultrasound imaging.",
      priceFils: 120000, // AED 1200
      category: "blood-tests"
    },
    {
      name: "Steroid Check",
      slug: "hc360-steroid-check",
      description: "Comprehensive steroid hormone panel for athletes and fitness enthusiasts monitoring hormonal balance.",
      priceFils: 140000, // AED 1400
      category: "blood-tests"
    },
    {
      name: "Corporate Essential Screening",
      slug: "hc360-corporate-essential",
      description: "Essential employee health screening package covering key health markers and basic wellness indicators.",
      priceFils: 39900, // AED 399
      category: "blood-tests"
    },
    {
      name: "Bio Well Woman Executive Package",
      slug: "hc360-bio-well-woman-exec",
      description: "Premium executive health screening package designed for women, including detailed blood work, cancer markers, and hormonal assessment.",
      priceFils: 360000, // AED 3600
      category: "blood-tests"
    },
    {
      name: "Corporate Basic Screening",
      slug: "hc360-corporate-basic",
      description: "Foundational corporate wellness screening with essential blood tests for employee health monitoring.",
      priceFils: 45000, // AED 450
      category: "blood-tests"
    },
    {
      name: "Corporate Silver Package",
      slug: "hc360-corporate-silver",
      description: "Enhanced corporate health package with expanded blood work and metabolic markers.",
      priceFils: 60000, // AED 600
      category: "blood-tests"
    },
    {
      name: "Corporate Gold Package",
      slug: "hc360-corporate-gold",
      description: "Premium corporate wellness package with comprehensive blood analysis and advanced health screening.",
      priceFils: 90000, // AED 900
      category: "blood-tests"
    },
    {
      name: "Corporate Platinum Plus – Male",
      slug: "hc360-corporate-platinum-male",
      description: "Executive-level corporate health package for men with extensive blood work, cancer screening, and cardiovascular assessment.",
      priceFils: 250000, // AED 2500
      category: "blood-tests"
    },
    {
      name: "Corporate Platinum Plus – Female",
      slug: "hc360-corporate-platinum-female",
      description: "Executive-level corporate health package for women with extensive blood work, cancer screening, and hormonal assessment.",
      priceFils: 315000, // AED 3150
      category: "blood-tests"
    }
  ];

  console.log(`Adding ${products.length} products for Healthchecks360...`);

  let addedCount = 0;
  let skippedCount = 0;

  for (const productData of products) {
    // Check if product already exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        vendorId: vendor.id,
        name: productData.name
      }
    });

    if (existingProduct) {
      console.log(`  ⊘ Product "${productData.name}" already exists, skipping`);
      skippedCount++;
      continue;
    }

    await prisma.product.create({
      data: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        priceFils: productData.priceFils,
        category: productData.category,
        vendorId: vendor.id,
        imageUrl: null,
        active: true,
        inStock: true,
        isGlobal: true // Set to true for UAE-wide availability
      }
    });

    console.log(`  ✓ Added: ${productData.name} (AED ${productData.priceFils / 100})`);
    addedCount++;
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Vendor: ${vendor.name} (${vendor.slug})`);
  console.log(`Products added: ${addedCount}`);
  console.log(`Products skipped (already exist): ${skippedCount}`);
  console.log(`Total products: ${addedCount + skippedCount}`);

  // Verify final count
  const totalProducts = await prisma.product.count({
    where: { vendorId: vendor.id }
  });
  console.log(`\n✓ Verified: ${totalProducts} products now exist for Healthchecks360`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\n✓ Seeding completed successfully!");
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("❌ Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
