// One-time script to add slugs to existing vendors
import { PrismaClient } from "@prisma/client";
import { generateSlug, generateUniqueSlug } from "../lib/utils/slug";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Adding slugs to existing vendors...");

  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true },
    where: {
      slug: null as any, // Find vendors without slugs (if migration allows null temporarily)
    },
  });

  // If schema doesn't allow null, get all vendors and check
  const allVendors = await prisma.vendor.findMany({
    select: { id: true, name: true, slug: true },
  });

  const vendorsNeedingSlugs = allVendors.filter((v) => !v.slug);

  if (vendorsNeedingSlugs.length === 0) {
    console.log("✅ All vendors already have slugs.");
    return;
  }

  let updated = 0;

  for (const vendor of vendorsNeedingSlugs) {
    const baseSlug = generateSlug(vendor.name);
    const slug = await generateUniqueSlug(baseSlug, async (candidate) => {
      const existing = await prisma.vendor.findUnique({ where: { slug: candidate } });
      return !!existing;
    });

    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { slug },
    });
    console.log(`✅ ${vendor.name}: slug = "${slug}"`);
    updated++;
  }

  console.log(`\n✨ Done! Added slugs to ${updated} vendors.`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
