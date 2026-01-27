import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { generateSlug } from "@/lib/utils/slug";
import { aedToFils } from "@/lib/utils/price";
import { normalizeCategory } from "@/lib/utils/category";

async function main() {
  console.log("🌱 Starting database seed...");

  // Always require ADMIN_EMAIL
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    throw new Error(
      "ADMIN_EMAIL environment variable is required. Please set it before running the seed script."
    );
  }

  // Check if admin user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingUser) {
    // User does NOT exist - require ADMIN_PASSWORD to create
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      throw new Error(
        "ADMIN_PASSWORD environment variable is required when creating a new admin user. Please set it before running the seed script."
      );
    }

    // Hash the password and create user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        name: "Admin User",
        role: "ADMIN",
      },
    });

    console.log(`✅ Created admin user: ${adminEmail}`);
  } else {
    // User DOES exist - check if password reset is forced
    const forceReset = process.env.FORCE_ADMIN_PASSWORD_RESET === "true";

    if (forceReset) {
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        throw new Error(
          "ADMIN_PASSWORD environment variable is required when FORCE_ADMIN_PASSWORD_RESET=true. Please set it before running the seed script."
        );
      }

      // Hash the password and update user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          passwordHash: hashedPassword,
          role: "ADMIN",
        },
      });

      console.log(`✅ Admin password reset for: ${adminEmail}`);
    } else {
      // User exists and no forced reset - leave password unchanged
      // Ensure role is ADMIN even if password unchanged
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "ADMIN" },
      });

      console.log(`✅ Admin user exists: ${adminEmail} (password unchanged, role set to ADMIN)`);
    }
  }

  // Seed locations
  const slugify = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const locations = [
    { name: "Dubai", slug: slugify("Dubai") },
    { name: "Abu Dhabi", slug: slugify("Abu Dhabi") },
    { name: "Sharjah", slug: slugify("Sharjah") },
    { name: "Sydney", slug: slugify("Sydney") },
    { name: "Brisbane", slug: slugify("Brisbane") },
  ];

  console.log("📍 Seeding locations...");
  const createdLocations = await Promise.all(
    locations.map((loc) =>
      prisma.location.upsert({
        where: { name: loc.name },
        update: { slug: loc.slug, isActive: true },
        create: { ...loc, isActive: true },
      })
    )
  );
  console.log(`✅ Created ${createdLocations.length} locations`);

  // Seed vendors
  const vendors = [
    { name: "HealthPlus Pharmacy", slug: "healthplus-pharmacy", status: "active" },
    { name: "MediCare Supplies", slug: "medicare-supplies", status: "active" },
  ];

  console.log("🏪 Seeding vendors...");
  const createdVendors = await Promise.all(
    vendors.map((vendor) =>
      prisma.vendor.create({
        data: vendor,
      })
    )
  );
  console.log(`✅ Created ${createdVendors.length} vendors`);

  // Helper to generate unique slug
  async function getUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    let exists = await prisma.product.findUnique({ where: { slug } });
    while (exists) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      exists = await prisma.product.findUnique({ where: { slug } });
    }
    return slug;
  }

  // Seed products with priceFils and slugs
  const productData = [
    {
      vendorId: createdVendors[0].id,
      name: "Vitamin D3 5000IU",
      description: "High-potency vitamin D3 supplement",
      category: "Supplements",
      priceAED: 45.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[0].id,
      name: "Omega-3 Fish Oil",
      description: "Premium fish oil capsules",
      category: "Supplements",
      priceAED: 35.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[0].id,
      name: "Multivitamin Complex",
      description: "Complete daily multivitamin",
      category: "Supplements",
      priceAED: 28.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[0].id,
      name: "Protein Powder",
      description: "Whey protein isolate",
      category: "Fitness",
      priceAED: 55.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[0].id,
      name: "Creatine Monohydrate",
      description: "Pure creatine powder",
      category: "Fitness",
      priceAED: 32.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[1].id,
      name: "Blood Pressure Monitor",
      description: "Digital blood pressure monitor",
      category: "Medical Equipment",
      priceAED: 85.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[1].id,
      name: "Glucose Meter",
      description: "Accurate glucose monitoring device",
      category: "Medical Equipment",
      priceAED: 42.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[1].id,
      name: "First Aid Kit",
      description: "Comprehensive first aid supplies",
      category: "Medical Supplies",
      priceAED: 25.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[1].id,
      name: "Thermometer Digital",
      description: "Fast-reading digital thermometer",
      category: "Medical Equipment",
      priceAED: 18.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
    {
      vendorId: createdVendors[1].id,
      name: "Hand Sanitizer 500ml",
      description: "Alcohol-based hand sanitizer",
      category: "Medical Supplies",
      priceAED: 12.00,
      imageUrl: null,
      inStock: true,
      active: true,
    },
  ];

  console.log("📦 Seeding products...");
  const createdProducts = [];
  for (const prod of productData) {
    const baseSlug = generateSlug(prod.name);
    const slug = await getUniqueSlug(baseSlug);
    const product = await prisma.product.create({
      data: {
        vendorId: prod.vendorId,
        name: prod.name,
        slug: slug,
        description: prod.description,
        category: normalizeCategory(prod.category),
        priceFils: aedToFils(prod.priceAED),
        imageUrl: prod.imageUrl,
        inStock: prod.inStock,
        active: prod.active,
      },
    });
    createdProducts.push(product);
  }
  console.log(`✅ Created ${createdProducts.length} products`);

  // Assign locations to products
  console.log("🔗 Assigning locations to products...");
  const locationAssignments = [];
  for (const product of createdProducts) {
    // Assign first 3 products to Dubai, Abu Dhabi, Sharjah
    if (createdProducts.indexOf(product) < 3) {
      for (let i = 0; i < 3; i++) {
        locationAssignments.push({
          productId: product.id,
          locationId: createdLocations[i].id,
        });
      }
    } else {
      // Assign remaining products to Sydney and Brisbane
      for (let i = 3; i < 5; i++) {
        locationAssignments.push({
          productId: product.id,
          locationId: createdLocations[i].id,
        });
      }
    }
  }

  // Create product-location assignments (handle duplicates manually for composite keys)
  let createdCount = 0;
  for (const assignment of locationAssignments) {
    try {
      await prisma.productLocation.create({
        data: assignment,
      });
      createdCount++;
    } catch (error: any) {
      // Ignore unique constraint errors (already exists)
      if (error.code !== 'P2002') {
        throw error;
      }
    }
  }
  console.log(`✅ Created ${createdCount} product-location assignments`);

  console.log("🎉 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
