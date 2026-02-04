import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const logoUpdates: Array<{ slug: string; logoUrl: string }> = [
  { slug: "instabloodz", logoUrl: "/vendors/bloodtestvendors/bloodz.png" },
  { slug: "healthchecks360", logoUrl: "/vendors/bloodtestvendors/healthchecks360.png" },
  { slug: "healthone-healthcare", logoUrl: "/vendors/bloodtestvendors/healthone-healthcare.png" },
  { slug: "firstresponse-healthcare", logoUrl: "/vendors/bloodtestvendors/firstresponse-healthcare.png" },
];

async function main() {
  for (const update of logoUpdates) {
    const vendor = await prisma.vendor.findUnique({
      where: { slug: update.slug },
      select: { id: true, slug: true, logoUrl: true },
    });

    if (!vendor) {
      console.warn(`[patch-vendor-logos] Missing vendor slug=${update.slug}`);
      continue;
    }

    if (vendor.logoUrl) {
      console.log(`[patch-vendor-logos] Skipping slug=${update.slug} (logoUrl already set)`);
      continue;
    }

    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { logoUrl: update.logoUrl },
    });

    console.log(`[patch-vendor-logos] Updated slug=${update.slug} -> ${update.logoUrl}`);
  }
}

main()
  .catch((error) => {
    console.error("[patch-vendor-logos] Failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
