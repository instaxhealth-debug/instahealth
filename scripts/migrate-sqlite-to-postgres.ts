import "dotenv/config";
import { PrismaClient as PostgresClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "@prisma/client-sqlite";

// Default to local SQLite path if env is missing
const SQLITE_URL = process.env.DATABASE_URL_SQLITE || "file:./prisma/prisma/dev.db";

// Guard: ensure Postgres URL is present
if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  console.error("❌ Missing DATABASE_URL or DIRECT_URL for Postgres. Aborting migration.");
  process.exit(1);
}

const sqlite = new SqliteClient({ datasources: { db: { url: SQLITE_URL } } });
const pg = new PostgresClient();

// Helpers
async function truncatePostgres() {
  // Only safe if target is empty; ensures idempotency
  await pg.$executeRawUnsafe(`TRUNCATE "VerificationToken", "Session", "Account", "VendorPayout", "CartItem", "Cart", "OrderItem", "Order", "ProductLocation", "ProductVariant", "Product", "Vendor", "Location", "User" RESTART IDENTITY CASCADE`);
}

async function migrate() {
  console.log("Starting migration SQLite -> Postgres");
  console.log("Source:", SQLITE_URL);
  console.log("Target:", process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":****@"));

  await truncatePostgres();

  // 1) Location
  const locations = await sqlite.location.findMany();
  await pg.location.createMany({ data: locations });
  console.log(`Locations migrated: ${locations.length}`);

  // 2) User
  const users = await sqlite.user.findMany();
  await pg.user.createMany({ data: users });
  console.log(`Users migrated: ${users.length}`);

  // 3) Vendor
  const vendors = await sqlite.vendor.findMany();
  await pg.vendor.createMany({ data: vendors });
  console.log(`Vendors migrated: ${vendors.length}`);

  // 4) Product
  const products = await sqlite.product.findMany();
  await pg.product.createMany({ data: products });
  console.log(`Products migrated: ${products.length}`);

  // 5) ProductVariant
  const variants = await sqlite.productVariant.findMany();
  if (variants.length > 0) {
    await pg.productVariant.createMany({ data: variants });
  }
  console.log(`ProductVariants migrated: ${variants.length}`);

  // 6) ProductLocation
  const productLocations = await sqlite.productLocation.findMany();
  if (productLocations.length > 0) {
    await pg.productLocation.createMany({ data: productLocations });
  }
  console.log(`ProductLocations migrated: ${productLocations.length}`);

  // 7) Cart
  const carts = await sqlite.cart.findMany();
  if (carts.length > 0) {
    await pg.cart.createMany({ data: carts });
  }
  console.log(`Carts migrated: ${carts.length}`);

  // 8) CartItem
  const cartItems = await sqlite.cartItem.findMany();
  if (cartItems.length > 0) {
    await pg.cartItem.createMany({ data: cartItems });
  }
  console.log(`CartItems migrated: ${cartItems.length}`);

  // 9) Order
  const orders = await sqlite.order.findMany();
  if (orders.length > 0) {
    await pg.order.createMany({ data: orders });
  }
  console.log(`Orders migrated: ${orders.length}`);

  // 10) OrderItem
  const orderItems = await sqlite.orderItem.findMany();
  if (orderItems.length > 0) {
    await pg.orderItem.createMany({ data: orderItems });
  }
  console.log(`OrderItems migrated: ${orderItems.length}`);

  // 11) VendorPayout
  const payouts = await sqlite.vendorPayout.findMany();
  if (payouts.length > 0) {
    await pg.vendorPayout.createMany({ data: payouts });
  }
  console.log(`VendorPayouts migrated: ${payouts.length}`);

  // 12) Account
  const accounts = await sqlite.account.findMany();
  if (accounts.length > 0) {
    await pg.account.createMany({ data: accounts });
  }
  console.log(`Accounts migrated: ${accounts.length}`);

  // 13) Session
  const sessions = await sqlite.session.findMany();
  if (sessions.length > 0) {
    await pg.session.createMany({ data: sessions });
  }
  console.log(`Sessions migrated: ${sessions.length}`);

  // 14) VerificationToken
  const vtoks = await sqlite.verificationToken.findMany();
  if (vtoks.length > 0) {
    await pg.verificationToken.createMany({ data: vtoks });
  }
  console.log(`VerificationTokens migrated: ${vtoks.length}`);

  console.log("✅ Migration completed");
}

migrate()
  .catch((err) => {
    console.error("Migration failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await pg.$disconnect();
    await sqlite.$disconnect();
  });
