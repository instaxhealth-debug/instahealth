/**
 * VENDOR PORTAL TEST DATA SEEDER
 *
 * Creates test data for vendor isolation testing:
 * - 2 vendor users (vendor1@test.com, vendor2@test.com)
 * - 2 vendor records linked to those users
 * - Sample orders for each vendor
 *
 * Run: npx ts-node scripts/seed-vendor-test-data.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding vendor test data...\n");

  // Create Vendor User 1
  const vendorUser1Password = await bcrypt.hash("vendor123", 10);
  const vendorUser1 = await prisma.user.upsert({
    where: { email: "vendor1@test.com" },
    update: {
      role: "VENDOR",
      passwordHash: vendorUser1Password,
    },
    create: {
      email: "vendor1@test.com",
      name: "Test Vendor 1",
      role: "VENDOR",
      passwordHash: vendorUser1Password,
    },
  });
  console.log("✓ Created vendor user 1:", vendorUser1.email);

  // Create Vendor User 2
  const vendorUser2Password = await bcrypt.hash("vendor123", 10);
  const vendorUser2 = await prisma.user.upsert({
    where: { email: "vendor2@test.com" },
    update: {
      role: "VENDOR",
      passwordHash: vendorUser2Password,
    },
    create: {
      email: "vendor2@test.com",
      name: "Test Vendor 2",
      role: "VENDOR",
      passwordHash: vendorUser2Password,
    },
  });
  console.log("✓ Created vendor user 2:", vendorUser2.email);

  // Create Vendor Record 1
  const vendor1 = await prisma.vendor.upsert({
    where: { slug: "test-vendor-1" },
    update: {
      userId: vendorUser1.id,
      email: vendorUser1.email,
      status: "active",
      verified: true,
    },
    create: {
      name: "Test Vendor 1",
      slug: "test-vendor-1",
      email: vendorUser1.email,
      userId: vendorUser1.id,
      status: "active",
      verified: true,
      logoUrl: "/logos/test-vendor-1.png",
      tagline: "Your trusted health partner",
      serviceRadiusKm: 25,
      enforceServiceRadius: true,
      allowOutOfRadiusOverride: false,
    },
  });
  console.log("✓ Created vendor 1:", vendor1.slug);

  // Create Vendor Record 2
  const vendor2 = await prisma.vendor.upsert({
    where: { slug: "test-vendor-2" },
    update: {
      userId: vendorUser2.id,
      email: vendorUser2.email,
      status: "active",
      verified: true,
    },
    create: {
      name: "Test Vendor 2",
      slug: "test-vendor-2",
      email: vendorUser2.email,
      userId: vendorUser2.id,
      status: "active",
      verified: true,
      logoUrl: "/logos/test-vendor-2.png",
      tagline: "Health products delivered fast",
      serviceRadiusKm: 30,
      enforceServiceRadius: true,
      allowOutOfRadiusOverride: true,
    },
  });
  console.log("✓ Created vendor 2:", vendor2.slug);

  // Create test customer
  const customerPassword = await bcrypt.hash("customer123", 10);
  const customer = await prisma.user.upsert({
    where: { email: "customer@test.com" },
    update: {},
    create: {
      email: "customer@test.com",
      name: "Test Customer",
      role: "USER",
      passwordHash: customerPassword,
    },
  });
  console.log("✓ Created test customer:", customer.email);

  // Create sample products for Vendor 1
  const product1 = await prisma.product.upsert({
    where: { slug: "test-product-vendor1" },
    update: {},
    create: {
      name: "Test Product Vendor 1",
      slug: "test-product-vendor1",
      vendorId: vendor1.id,
      category: "supplements",
      priceFils: 5000, // 50 AED
      description: "Test product from vendor 1",
      inStock: true,
      active: true,
      published: true,
    },
  });
  console.log("✓ Created product for vendor 1");

  // Create sample products for Vendor 2
  const product2 = await prisma.product.upsert({
    where: { slug: "test-product-vendor2" },
    update: {},
    create: {
      name: "Test Product Vendor 2",
      slug: "test-product-vendor2",
      vendorId: vendor2.id,
      category: "supplements",
      priceFils: 7500, // 75 AED
      description: "Test product from vendor 2",
      inStock: true,
      active: true,
      published: true,
    },
  });
  console.log("✓ Created product for vendor 2");

  // Create sample order for Vendor 1
  const order1 = await prisma.order.create({
    data: {
      userId: customer.id,
      status: "PAID",
      subtotalFils: 5000,
      deliveryFils: 0,
      totalFils: 5000,
      currency: "AED",
      shippingName: "Test Customer",
      shippingPhone: "+971501234567",
      shippingAddressLine1: "123 Test Street",
      shippingArea: "Dubai Marina",
      shippingEmirate: "Dubai",
      acceptedTerms: true,
      acceptedDisclaimer: true,
      ageConfirmed: true,
    },
  });

  const orderItem1 = await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: product1.id,
      vendorId: vendor1.id,
      quantity: 1,
      unitPriceFils: 5000,
      lineTotalFils: 5000,
      productName: product1.name,
      productSlug: product1.slug,
      vendorName: vendor1.name,
    },
  });

  const vendorOrder1 = await prisma.vendorOrder.create({
    data: {
      orderId: order1.id,
      vendorId: vendor1.id,
      status: "READY_FOR_FULFILLMENT",
      subtotalFils: 5000,
      totalFils: 5000,
      acceptBy: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  });

  await prisma.vendorOrderItem.create({
    data: {
      vendorOrderId: vendorOrder1.id,
      orderItemId: orderItem1.id,
    },
  });

  console.log("✓ Created test order for vendor 1:", vendorOrder1.id);

  // Create sample order for Vendor 2
  const order2 = await prisma.order.create({
    data: {
      userId: customer.id,
      status: "PAID",
      subtotalFils: 7500,
      deliveryFils: 0,
      totalFils: 7500,
      currency: "AED",
      shippingName: "Test Customer",
      shippingPhone: "+971501234567",
      shippingAddressLine1: "456 Another Street",
      shippingArea: "Jumeirah",
      shippingEmirate: "Dubai",
      acceptedTerms: true,
      acceptedDisclaimer: true,
      ageConfirmed: true,
    },
  });

  const orderItem2 = await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      productId: product2.id,
      vendorId: vendor2.id,
      quantity: 1,
      unitPriceFils: 7500,
      lineTotalFils: 7500,
      productName: product2.name,
      productSlug: product2.slug,
      vendorName: vendor2.name,
    },
  });

  const vendorOrder2 = await prisma.vendorOrder.create({
    data: {
      orderId: order2.id,
      vendorId: vendor2.id,
      status: "READY_FOR_FULFILLMENT",
      subtotalFils: 7500,
      totalFils: 7500,
      acceptBy: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  });

  await prisma.vendorOrderItem.create({
    data: {
      vendorOrderId: vendorOrder2.id,
      orderItemId: orderItem2.id,
    },
  });

  console.log("✓ Created test order for vendor 2:", vendorOrder2.id);

  console.log("\n✅ Seed complete!\n");
  console.log("Test Credentials:");
  console.log("================");
  console.log("Vendor 1: vendor1@test.com / vendor123");
  console.log("Vendor 2: vendor2@test.com / vendor123");
  console.log("\nVendor Order IDs:");
  console.log("================");
  console.log(`Vendor 1 Order: ${vendorOrder1.id}`);
  console.log(`Vendor 2 Order: ${vendorOrder2.id}`);
  console.log("\nTest vendor isolation by:");
  console.log("1. Login as vendor1@test.com");
  console.log("2. Try to access /vendor/orders/" + vendorOrder2.id);
  console.log("3. Should get 404 (access denied)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
