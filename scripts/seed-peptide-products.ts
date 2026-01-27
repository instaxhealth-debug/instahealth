import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const uaeVendor = await prisma.vendor.findUnique({ where: { slug: "uae-peptides" } });
  const syncomVendor = await prisma.vendor.findUnique({ where: { slug: "syncom-peptides" } });

  if (!uaeVendor || !syncomVendor) {
    console.error("Vendors not found. Run seed:vendors first.");
    process.exit(1);
  }

  await prisma.product.upsert({
    where: { slug: "uae-bpc157" },
    update: {},
    create: {
      name: "BPC-157",
      slug: "uae-bpc157",
      category: "peptides",
      priceFils: 8999,
      active: true,
      inStock: true,
      isGlobal: true,
      vendorId: uaeVendor.id,
    },
  });

  await prisma.product.upsert({
    where: { slug: "syncom-tb500" },
    update: {},
    create: {
      name: "TB-500",
      slug: "syncom-tb500",
      category: "peptides",
      priceFils: 9999,
      active: true,
      inStock: true,
      isGlobal: true,
      vendorId: syncomVendor.id,
    },
  });

  console.log("Seeded peptide products for UAE Peptides and Syncom Peptides");
}

main()
  .catch((err) => {
    console.error("Failed to seed products", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
