import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const aedToFils = (aed: number) => Math.round(aed * 100);

const ivDripProducts = [
  { name: "ORIGINAL IV DRIP (Cold, Flu, Jet lag)", priceAED: 900 },
  { name: "HI-C IV DRIP", priceAED: 1100 },
  { name: "Glutathion", priceAED: 330 },
  { name: "PRE/POST PARTY IV DRIP", priceAED: 1250 },
  { name: "IMMUNE BOOST IV DRIP", priceAED: 1400 },
  { name: "MEMORY BOOST", priceAED: 1400 },
  { name: "SUPER DETOX IV DRIP", priceAED: 1400 },
  { name: "FITNESS DRIP", priceAED: 1650 },
  { name: "WEIGHT LOSS", priceAED: 1650 },
  { name: "SKIN HAIR AND NAILS IV DRIP", priceAED: 1650 },
  { name: "HEALTHY GUT IV DRIP", priceAED: 1800 },
  { name: "ANTI STRESS DRIP", priceAED: 1650 },
  { name: "ULTIMATE IV DRIP", priceAED: 1950 },
  { name: "ULTIMATE PLUS IV DRIP", priceAED: 2850 },
  { name: "NAD + IV DRIP 250 mg", priceAED: 2500 },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

async function upsertVendorProducts(vendorSlug: string, makeHouseBrand = false) {
  const vendor = await prisma.vendor.findUnique({ where: { slug: vendorSlug } });
  if (!vendor) {
    throw new Error(`Vendor not found: ${vendorSlug}`);
  }

  if (makeHouseBrand && !vendor.isHouseBrand) {
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { isHouseBrand: true },
    });
  }

  for (const product of ivDripProducts) {
    const baseSlug = slugify(product.name);
    const slug = `${vendorSlug}-${baseSlug}`;

    await prisma.product.upsert({
      where: { slug },
      update: {
        name: product.name,
        category: "iv-drips",
        priceFils: aedToFils(product.priceAED),
        active: true,
        inStock: true,
        isGlobal: true,
        vendorId: vendor.id,
      },
      create: {
        name: product.name,
        slug,
        category: "iv-drips",
        priceFils: aedToFils(product.priceAED),
        active: true,
        inStock: true,
        isGlobal: true,
        vendorId: vendor.id,
      },
    });
  }

  console.log(`✅ Upserted ${ivDripProducts.length} IV drip products for ${vendor.name}`);
}

async function main() {
  await upsertVendorProducts("ivz", true);
  await upsertVendorProducts("wellth");
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed IV drip products", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
