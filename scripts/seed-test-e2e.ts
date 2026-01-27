/**
 * End-to-End Test Seed Script
 * 
 * Seeds database with realistic multi-vendor scenario:
 * - 2 Vendors (InstaPepz + MediPro)
 * - 1 Location (Dubai)
 * - Product A (InstaPepz) with variants: base 100 AED, variant 200 AED
 * - Product B (MediPro) no variants, 150 AED
 * - 1 Test user
 * 
 * Run: npx ts-node scripts/seed-test-e2e.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Clearing existing data...");
  
  // Clear in correct order (respecting foreign keys)
  await prisma.vendorPayout.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productLocation.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database cleared\n");

  // ================== CREATE TEST USER ==================
  console.log("👤 Creating test user...");
  const testUser = await prisma.user.create({
    data: {
      email: "test@instahealth.com",
      name: "Test User",
      passwordHash: await bcrypt.hash("password123", 10),
      role: "USER",
    },
  });
  console.log(`✅ Created user: ${testUser.email}\n`);

  // ================== CREATE LOCATION ==================
  console.log("📍 Creating location...");
  const location = await prisma.location.create({
    data: {
      name: "Dubai",
      slug: "dubai",
      isActive: true,
    },
  });
  console.log(`✅ Created location: ${location.name}\n`);

  // ================== CREATE VENDORS ==================
  console.log("🏪 Creating vendors...");
  const vendor1 = await prisma.vendor.create({
    data: {
      name: "InstaPepz",
      slug: "instapepz",
      email: "vendor1@instahealth.com",
      status: "active",
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: "MediPro",
      slug: "medipro",
      email: "vendor2@instahealth.com",
      status: "active",
    },
  });
  console.log(`✅ Created vendors: ${vendor1.name}, ${vendor2.name}\n`);

  // ================== CREATE PRODUCTS ==================
  console.log("📦 Creating products...");
  
  // Product A (Vendor 1) - WITH VARIANTS
  const productA = await prisma.product.create({
    data: {
      vendorId: vendor1.id,
      name: "BPC-157 Injectable",
      slug: "bpc-157-injectable",
      description: "Premium peptide for healing and recovery",
      category: "Peptides",
      priceFils: 10000, // Base price 100 AED (not used when variants exist)
      imageUrl: null,
      inStock: true,
      active: true,
    },
  });

  console.log(`✅ Created product: ${productA.name} (Vendor 1, base price 100 AED)`);

  // Create variants for Product A
  const variantA1 = await prisma.productVariant.create({
    data: {
      productId: productA.id,
      sku: "BPC157-5MG",
      strength: "5mg",
      unitSize: "1 vial",
      priceFils: 20000, // 200 AED - THIS IS THE VARIANT WE'LL TEST
      inStock: true,
      active: true,
    },
  });

  const variantA2 = await prisma.productVariant.create({
    data: {
      productId: productA.id,
      sku: "BPC157-10MG",
      strength: "10mg",
      unitSize: "1 vial",
      priceFils: 35000, // 350 AED
      inStock: true,
      active: true,
    },
  });

  console.log(`  ✅ Created variant: ${variantA1.strength} @ ${variantA1.priceFils/100} AED [TARGET]`);
  console.log(`  ✅ Created variant: ${variantA2.strength} @ ${variantA2.priceFils/100} AED\n`);

  // Product B (Vendor 2) - NO VARIANTS
  const productB = await prisma.product.create({
    data: {
      vendorId: vendor2.id,
      name: "Glutathione IV Drip",
      slug: "glutathione-iv-drip",
      description: "Powerful antioxidant IV therapy",
      category: "IV Drips",
      priceFils: 15000, // 150 AED
      imageUrl: null,
      inStock: true,
      active: true,
    },
  });

  console.log(`✅ Created product: ${productB.name} (Vendor 2, price 150 AED, no variants)\n`);

  // ================== ASSIGN PRODUCTS TO LOCATION ==================
  console.log("🔗 Assigning products to location...");
  await prisma.productLocation.createMany({
    data: [
      { productId: productA.id, locationId: location.id },
      { productId: productB.id, locationId: location.id },
    ],
  });
  console.log(`✅ Assigned both products to ${location.name}\n`);

  // ================== SUMMARY ==================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ E2E TEST DATA SEEDED SUCCESSFULLY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  console.log("📋 TEST SCENARIO READY:\n");
  console.log("🧪 Test User:");
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Password: password123\n`);
  
  console.log("🏪 Vendors:");
  console.log(`   1. ${vendor1.name} (ID: ${vendor1.id})`);
  console.log(`   2. ${vendor2.name} (ID: ${vendor2.id})\n`);
  
  console.log("📦 Products:");
  console.log(`   Product A: ${productA.name}`);
  console.log(`      Vendor: ${vendor1.name}`);
  console.log(`      Variant (5mg): ${variantA1.priceFils/100} AED ← TEST THIS`);
  console.log(`      Variant (10mg): ${variantA2.priceFils/100} AED`);
  console.log(`      Variant ID (5mg): ${variantA1.id}`);
  console.log(`\n   Product B: ${productB.name}`);
  console.log(`      Vendor: ${vendor2.name}`);
  console.log(`      Price: ${productB.priceFils/100} AED (no variants)\n`);
  
  console.log("📍 Location: Dubai\n");
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 E2E TEST FLOW:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. Add Product A (5mg variant) @ 200 AED to cart");
  console.log("2. Add Product B @ 150 AED to cart");
  console.log("3. Checkout (total: 350 AED)");
  console.log("4. Pay with Stripe test card: 4242 4242 4242 4242");
  console.log("5. Verify webhook sets order to PAID");
  console.log("6. Verify OrderItem has correct variant pricing");
  console.log("7. Vendor 1 fulfills their item");
  console.log("8. Vendor 2 fulfills their item");
  console.log("9. Order becomes FULFILLED");
  console.log("10. Admin creates payouts for both vendors");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  console.log("🚀 Ready to test!");
  console.log("Run: npm run dev");
  console.log("Then login and navigate to /marketplace/peptides\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
