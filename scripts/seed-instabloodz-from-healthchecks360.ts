import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Duplicating Healthchecks360 blood-tests products into InstaBloodz...\n");

  // 1) Get vendor IDs
  const healthchecks360 = await prisma.vendor.findUnique({
    where: { slug: "healthchecks360" },
    select: { id: true, name: true },
  });

  const instabloodz = await prisma.vendor.findUnique({
    where: { slug: "instabloodz" },
    select: { id: true, name: true },
  });

  if (!healthchecks360) {
    throw new Error("❌ Healthchecks360 vendor not found");
  }

  if (!instabloodz) {
    throw new Error("❌ InstaBloodz vendor not found");
  }

  console.log(`✅ Source vendor: ${healthchecks360.name}`);
  console.log(`✅ Target vendor: ${instabloodz.name}\n`);

  // 2) Fetch all Healthchecks360 blood-tests products
  const sourceProducts = await prisma.product.findMany({
    where: {
      vendorId: healthchecks360.id,
      category: "blood-tests",
    },
    orderBy: { name: "asc" },
  });

  console.log(`📦 Found ${sourceProducts.length} Healthchecks360 blood-tests products\n`);

  if (sourceProducts.length === 0) {
    console.log("⚠️  No products to duplicate");
    return;
  }

  // 3) Transform and upsert each product for InstaBloodz
  let created = 0;
  let updated = 0;

  for (const source of sourceProducts) {
    // Transform name: Remove "Bio " prefix, clean up for InstaBloodz branding
    let transformedName = source.name;
    
    // Remove "Bio " prefix if present
    transformedName = transformedName.replace(/^Bio /i, "");
    
    // Don't add "InstaBloodz" prefix to avoid redundancy since vendor name shows it
    // Keep names professional and clean
    
    // Generate unique slug with instabloodz prefix
    const newSlug = `instabloodz-${source.slug.replace(/^hc360-/, "")}`;
    
    // Create description indicating inquiry pricing
    const newDescription = "INQUIRE ONLY — Pricing provided on request. Comprehensive blood test and wellness screening package.";

    const productData = {
      vendorId: instabloodz.id,
      name: transformedName,
      slug: newSlug,
      description: newDescription,
      category: "blood-tests",
      priceFils: 0, // Trigger "Inquire" display
      imageUrl: null,
      active: true,
      inStock: true,
      isGlobal: true,
    };

    const result = await prisma.product.upsert({
      where: { slug: newSlug },
      update: productData,
      create: productData,
    });

    // Check if it was newly created or updated
    const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
    if (wasCreated) {
      created++;
      console.log(`  ✅ Created: ${transformedName} (${newSlug})`);
    } else {
      updated++;
      console.log(`  🔄 Updated: ${transformedName} (${newSlug})`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total:   ${created + updated}`);

  // 4) Verify final counts
  const healthchecks360Count = await prisma.product.count({
    where: {
      vendorId: healthchecks360.id,
      category: "blood-tests",
      active: true,
    },
  });

  const instabloodziCount = await prisma.product.count({
    where: {
      vendorId: instabloodz.id,
      category: "blood-tests",
      active: true,
    },
  });

  console.log(`\n✅ Final active blood-tests counts:`);
  console.log(`   Healthchecks360: ${healthchecks360Count}`);
  console.log(`   InstaBloodz:     ${instabloodziCount}`);
  console.log(`\n✅ Duplication complete! InstaBloodz now has ${instabloodziCount} blood-tests products.`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
