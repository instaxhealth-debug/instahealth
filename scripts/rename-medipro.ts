import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Update MediPro vendor to MyDoctorHealthcare
  const vendor = await prisma.vendor.update({
    where: { slug: "medipro" },
    data: {
      name: "MyDoctorHealthcare",
      slug: "mydoctorhealthcare",
      tagline: "Home & Mobile Lab Testing",
      status: "active",
    },
  });

  console.log(`✅ Vendor updated:`, vendor.name, `(${vendor.slug})`);

  // Find and update the product for this vendor
  const product = await prisma.product.findFirst({
    where: { vendorId: vendor.id },
  });

  if (product) {
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        name: "At-Home Lab Test Service",
        category: "blood-tests",
        active: true,
        inStock: true,
        isGlobal: true,
      },
    });
    console.log(`✅ Product updated:`, updated.name);
  }

  // Verify the setup
  const finalVendor = await prisma.vendor.findUnique({
    where: { slug: "mydoctorhealthcare" },
    include: {
      products: {
        where: { category: "blood-tests", active: true },
      },
    },
  });

  console.log(`\n✅ Final verification:`);
  console.log(`   Vendor: ${finalVendor?.name} (${finalVendor?.slug})`);
  console.log(`   Tagline: ${finalVendor?.tagline}`);
  console.log(`   Products in blood-tests: ${finalVendor?.products.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
