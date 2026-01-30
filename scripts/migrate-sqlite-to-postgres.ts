import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const sqliteDbPath = "/Users/cruzfrangieh/Desktop/instaxhealth website/prisma/prisma/dev.db";

const pg = new PrismaClient();
const sqlite = new Database(sqliteDbPath, { readonly: true });

const toBool = (value: any) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return value;
};

const toDate = (value: any) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return value;
};

const mapLocation = (row: any) => ({
  ...row,
  isActive: toBool(row.isActive),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapVendor = (row: any) => ({
  ...row,
  complianceAccepted: toBool(row.complianceAccepted),
  complianceAcceptedAt: toDate(row.complianceAcceptedAt),
  isHouseBrand: toBool(row.isHouseBrand),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapProduct = (row: any) => ({
  ...row,
  inStock: toBool(row.inStock),
  active: toBool(row.active),
  isGlobal: toBool(row.isGlobal),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapProductVariant = (row: any) => ({
  ...row,
  inStock: toBool(row.inStock),
  active: toBool(row.active),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapUser = (row: any) => ({
  ...row,
  emailVerified: toDate(row.emailVerified),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapCart = (row: any) => ({
  ...row,
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapCartItem = (row: any) => ({
  ...row,
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapSession = (row: any) => ({
  ...row,
  expires: toDate(row.expires),
});

const mapVerificationToken = (row: any) => ({
  ...row,
  expires: toDate(row.expires),
});

const mapOrder = (row: any) => ({
  ...row,
  acceptedTerms: toBool(row.acceptedTerms),
  acceptedDisclaimer: toBool(row.acceptedDisclaimer),
  ageConfirmed: toBool(row.ageConfirmed),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapOrderItem = (row: any) => ({
  ...row,
  fulfilled: toBool(row.fulfilled),
  fulfilledAt: toDate(row.fulfilledAt),
});

const mapVendorPayout = (row: any) => ({
  ...row,
  paidAt: toDate(row.paidAt),
  periodStart: toDate(row.periodStart),
  periodEnd: toDate(row.periodEnd),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

async function migrateData() {
  console.log("🔄 SQLite → Postgres Migration\n");

  try {
    const locations = sqlite.prepare("SELECT * FROM Location").all() as any[];
    if (locations.length > 0) {
      await pg.location.createMany({ data: locations.map(mapLocation), skipDuplicates: true });
    }
    console.log(`✓ Location: ${locations.length}`);

    const vendors = sqlite.prepare("SELECT * FROM Vendor").all() as any[];
    if (vendors.length > 0) {
      await pg.vendor.createMany({ data: vendors.map(mapVendor), skipDuplicates: true });
    }
    console.log(`✓ Vendor: ${vendors.length}`);

    const products = sqlite.prepare("SELECT * FROM Product").all() as any[];
    if (products.length > 0) {
      await pg.product.createMany({ data: products.map(mapProduct), skipDuplicates: true });
    }
    console.log(`✓ Product: ${products.length}`);

    const productLocations = sqlite.prepare("SELECT * FROM ProductLocation").all() as any[];
    if (productLocations.length > 0) {
      for (const pl of productLocations) {
        try {
          await pg.productLocation.upsert({
            where: { productId_locationId: { productId: pl.productId, locationId: pl.locationId } },
            create: pl,
            update: pl,
          });
        } catch {}
      }
    }
    console.log(`✓ ProductLocation: ${productLocations.length}`);

    const variants = sqlite.prepare("SELECT * FROM ProductVariant").all() as any[];
    if (variants.length > 0) {
      await pg.productVariant.createMany({ data: variants.map(mapProductVariant), skipDuplicates: true });
    }
    console.log(`✓ ProductVariant: ${variants.length}`);

    const users = sqlite.prepare("SELECT * FROM User").all() as any[];
    if (users.length > 0) {
      await pg.user.createMany({ data: users.map(mapUser), skipDuplicates: true });
    }
    console.log(`✓ User: ${users.length}`);

    const carts = sqlite.prepare("SELECT * FROM Cart").all() as any[];
    if (carts.length > 0) {
      await pg.cart.createMany({ data: carts.map(mapCart), skipDuplicates: true });
    }
    console.log(`✓ Cart: ${carts.length}`);

    const cartItems = sqlite.prepare("SELECT * FROM CartItem").all() as any[];
    if (cartItems.length > 0) {
      await pg.cartItem.createMany({ data: cartItems.map(mapCartItem), skipDuplicates: true });
    }
    console.log(`✓ CartItem: ${cartItems.length}`);

    const accounts = sqlite.prepare("SELECT * FROM Account").all() as any[];
    if (accounts.length > 0) {
      await pg.account.createMany({ data: accounts, skipDuplicates: true });
    }
    console.log(`✓ Account: ${accounts.length}`);

    const sessions = sqlite.prepare("SELECT * FROM Session").all() as any[];
    if (sessions.length > 0) {
      await pg.session.createMany({ data: sessions.map(mapSession), skipDuplicates: true });
    }
    console.log(`✓ Session: ${sessions.length}`);

    const orders = sqlite.prepare("SELECT * FROM \"Order\"").all() as any[];
    if (orders.length > 0) {
      await pg.order.createMany({ data: orders.map(mapOrder), skipDuplicates: true });
    }
    console.log(`✓ Order: ${orders.length}`);

    const orderItems = sqlite.prepare("SELECT * FROM \"OrderItem\"").all() as any[];
    if (orderItems.length > 0) {
      await pg.orderItem.createMany({ data: orderItems.map(mapOrderItem), skipDuplicates: true });
    }
    console.log(`✓ OrderItem: ${orderItems.length}`);

    const payouts = sqlite.prepare("SELECT * FROM VendorPayout").all() as any[];
    if (payouts.length > 0) {
      await pg.vendorPayout.createMany({ data: payouts.map(mapVendorPayout), skipDuplicates: true });
    }
    console.log(`✓ VendorPayout: ${payouts.length}`);

    const tokens = sqlite.prepare("SELECT * FROM VerificationToken").all() as any[];
    if (tokens.length > 0) {
      for (const token of tokens) {
        const mappedToken = mapVerificationToken(token);
        try {
          await pg.verificationToken.upsert({
            where: { identifier_token: { identifier: mappedToken.identifier, token: mappedToken.token } },
            create: mappedToken,
            update: mappedToken,
          });
        } catch {}
      }
    }
    console.log(`✓ VerificationToken: ${tokens.length}`);

    console.log("\n✅ Migration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pg.$disconnect();
    sqlite.close();
  }
}

migrateData().catch((err) => {
  console.error(err);
  process.exit(1);
});
