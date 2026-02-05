import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Fetch vendors and locations
  const vendors = await prisma.vendor.findMany({ where: { status: "active" } });
  const locations = await prisma.location.findMany({ where: { isActive: true } });

  if (vendors.length === 0) {
    console.error("No active vendors found. Run seed:vendors first.");
    process.exit(1);
  }

  if (locations.length === 0) {
    console.error("No active locations found. Run seed:locations first.");
    process.exit(1);
  }

  const dubai = locations.find((l) => l.slug === "dubai")!;
  const abuDhabi = locations.find((l) => l.slug === "abu-dhabi")!;
  const instapepz = vendors.find((v) => v.slug === "instapepz")!;
  const alZahraLabs = vendors.find((v) => v.slug === "al-zahra-labs")!;
  const ivDripsDubai = vendors.find((v) => v.slug === "iv-drips-dubai")!;

  const products = [
    // Peptides (InstaPepz)
    {
      vendorId: instapepz.id,
      name: "Peptide Starter Pack",
      slug: "peptide-starter-pack",
      category: "peptides",
      priceFils: 50000,
      isGlobal: false,
      locationIds: [dubai.id],
    },
    {
      vendorId: instapepz.id,
      name: "Global Peptide Mix",
      slug: "global-peptide-mix",
      category: "peptides",
      priceFils: 75000,
      isGlobal: true,
      locationIds: [],
    },
    // Blood Tests (Al Zahra Labs)
    {
      vendorId: alZahraLabs.id,
      name: "Comprehensive Blood Panel",
      slug: "comprehensive-blood-panel",
      category: "blood-tests",
      priceFils: 30000,
      isGlobal: false,
      locationIds: [dubai.id, abuDhabi.id],
    },
    // IV Drips (IV Drips Dubai - Abu Dhabi only)
    {
      vendorId: ivDripsDubai.id,
      name: "Hydration IV Drip",
      slug: "hydration-iv-drip",
      category: "iv-drips",
      priceFils: 20000,
      isGlobal: false,
      locationIds: [abuDhabi.id],
    },
    // Supplements (InstaPepz - Global)
    {
      vendorId: instapepz.id,
      name: "Vitamin C Plus",
      slug: "vitamin-c-plus",
      category: "supplements",
      priceFils: 5000,
      isGlobal: true,
      locationIds: [],
    },
    // Hormones (Al Zahra Labs - Dubai)
    {
      vendorId: alZahraLabs.id,
      name: "TRT Starter Kit",
      slug: "trt-starter-kit",
      category: "hormones",
      priceFils: 100000,
      isGlobal: false,
      locationIds: [dubai.id],
    },
    // Consultations (InstaPepz - Global)
    {
      vendorId: instapepz.id,
      name: "Initial Consultation",
      slug: "initial-consultation",
      category: "consultations",
      priceFils: 10000,
      isGlobal: true,
      locationIds: [],
    },
  ];

  for (const product of products) {
    const { locationIds, ...productData } = product;

    // Create or update product
    const created = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        ...productData,
      },
      create: {
        ...productData,
        active: true,
        inStock: true,
      },
    });

    // Clear existing locations
    await prisma.productLocation.deleteMany({ where: { productId: created.id } });

    // Add new locations if not global
    if (!productData.isGlobal && locationIds.length > 0) {
      await prisma.productLocation.createMany({
        data: locationIds.map((locationId) => ({
          productId: created.id,
          locationId,
        })),
      });
    }
  }

  console.log(`Seeded ${products.length} products`);
}

main()
  .catch((err) => {
    console.error("Failed to seed products", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
