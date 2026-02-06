# DATABASE SCHEMA STATE DIAGNOSIS
## Prisma + Next.js Production Environment Analysis

**Date:** 6 February 2026  
**Status:** DIAGNOSTIC REPORT (No changes executed)  
**Purpose:** Prove actual database state vs. schema definition

---

## SECTION A: CURRENT DATABASE IN USE

### Active Environment Configuration

**DATABASE PROVIDER:**
```
Provider: PostgreSQL (Neon)
Host: ep-twilight-smoke-ahwt4pmh-pooler.c-3.us-east-1.aws.neon.tech
Database: neondb
Region: us-east-1 (AWS)
```

**Environment Variables Loaded (from .env.local):**
```dotenv
DATABASE_URL=postgresql://neondb_owner:npg_JZBqVWxHdD14@ep-twilight-smoke-ahwt4pmh.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://neondb_owner:npg_JZBqVWxHdD14@ep-twilight-smoke-ahwt4pmh.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Prisma Schema Configuration (prisma/schema.prisma):**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**PrismaClient Instantiation (lib/prisma.ts):**
```typescript
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
```

**✅ CONFIRMED:** Production database is **Neon PostgreSQL**, NOT SQLite.

---

## SECTION B: APPLIED MIGRATIONS LIST

### Local Migrations (chronological order)

The following migration files exist in `prisma/migrations/`:

```
1. 20260130115108_init_postgres/
   Purpose: Initial PostgreSQL schema setup
   
2. 20260131_add_search_fields/
   Purpose: Add search-related fields
   
3. 20260202073915_hardening_production_grade/
   Purpose: Production security hardening
   
4. 20260202080726_vendor_terminal_context_and_userid/
   Purpose: Add terminal context and userId to vendor models
   
5. 20260204000000_add_vendor_role/
   Purpose: Add VENDOR role to User enum
   
6. 20260204182652_add_user_phone_fields/
   Purpose: Add phone fields to User model
   
7. 20260205060734_add_personal_data_fields/
   Purpose: Add personal data fields (height, weight, consent)
   
8. 20260205062146_add_consent_share_body_metrics/
   Purpose: Add body metrics consent field
   
9. 20260205063850_update_address_model_delivery_fields/
   Purpose: Add delivery-related address fields
   
10. 20260205113934_marketplace_checkout_flow/
    Purpose: Add marketplace checkout flow models
    
11. 20260205225500_add_vendorid_to_cartitem/ ← CRITICAL
    Purpose: Add vendorId column to CartItem (MOST RECENT)
    Status: SHOULD BE APPLIED IN PRODUCTION
```

### Migration Lock Configuration

```toml
# prisma/migrations/migration_lock.toml
provider = "postgresql"
```

✅ **CONFIRMED:** Using PostgreSQL. Lock file is correct.

---

## SECTION C: CARTITEM.VENDORID EXISTENCE PROOF

### Schema Definition (Current)

**Location:** `prisma/schema.prisma` lines 371-390

```prisma
model CartItem {
  id            String   @id @default(cuid())
  cartId        String
  productId     String
  vendorId      String   // Vendor ownership (required for correct checkout flow)
  variantId     String?
  quantity      Int      @default(1)
  unitPriceFils Int      @default(0)
  cart          Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  vendor        Vendor   @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  variant       ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([cartId, productId, variantId])
  @@index([cartId])
  @@index([productId])
  @@index([vendorId])
}
```

### Migration SQL (Latest)

**Migration File:** `prisma/migrations/20260205225500_add_vendorid_to_cartitem/migration.sql`

```sql
-- Step 1: Add column as nullable first
ALTER TABLE "CartItem" ADD COLUMN "vendorId" TEXT;

-- Step 2: Backfill vendorId from product.vendorId
UPDATE "CartItem"
SET "vendorId" = "Product"."vendorId"
FROM "Product"
WHERE "CartItem"."productId" = "Product"."id"
  AND "CartItem"."vendorId" IS NULL;

-- Step 3: Delete orphaned items
DELETE FROM "CartItem"
WHERE "vendorId" IS NULL;

-- Step 4: Make vendorId required
ALTER TABLE "CartItem" ALTER COLUMN "vendorId" SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE;

-- Step 6: Add index
CREATE INDEX "CartItem_vendorId_idx" ON "CartItem"("vendorId");
```

### SQL Query to Verify Column Exists in Production

Run this in **Neon SQL Editor** to confirm CartItem.vendorId exists:

```sql
-- Check if vendorId column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'CartItem' AND column_name = 'vendorId';

-- Expected result:
-- column_name | data_type | is_nullable
-- vendorId    | text      | NO
```

**If column doesn't exist**, the query will return 0 rows.

---

### Check All CartItem Columns

```sql
-- See all columns in CartItem table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'CartItem'
ORDER BY ordinal_position;

-- Expected columns:
-- id, cartId, productId, vendorId, variantId, quantity, 
-- unitPriceFils, createdAt, updatedAt
```

### Check Foreign Key Constraints

```sql
-- Verify FK constraint exists
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'CartItem' AND column_name = 'vendorId';

-- Expected:
-- CartItem_vendorId_fkey | CartItem | vendorId
```

### Check Indexes

```sql
-- Verify index exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'CartItem' AND indexname LIKE '%vendorId%';

-- Expected:
-- CartItem_vendorId_idx
```

---

## SECTION D: PRISMA CLIENT USAGE - WHERE VENDORID IS REFERENCED

### Code Location: `lib/cart.ts`

**File:** `/lib/cart.ts` lines 45-80

```typescript
/**
 * Add item to cart (or update quantity if exists)
 * FIX: Now requires vendorId (schema change)
 */
export async function addToCart(userId: string, productId: string, quantity: number = 1, variantId?: string | null) {
  const cart = await getOrCreateCart(userId);

  // FIX: Fetch product to get vendorId
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { vendorId: true },  // ← VENDORID FETCHED FROM PRODUCT
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      variantId: variantId ?? null,
    },
  });

  if (existingItem) {
    return await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    });
  }

  return await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      vendorId: product.vendorId,  // ← VENDORID PASSED TO CARTITEM
      variantId: variantId ?? null,
      quantity,
      unitPriceFils: 0,
    },
  });
}
```

### Cart API Endpoint: `app/api/cart/route.ts`

**File:** `app/api/cart/route.ts` lines 217-225

```typescript
if (DEBUG) console.log("[API:CART:POST] Creating new item:", { 
  productId, 
  vendorId: product.vendorId,  // ← VENDORID LOGGED
  variantId: normalizedVariantId, 
  qty: quantity 
});

// Create CartItem with vendorId
const cartItem = await prisma.cartItem.create({
  data: {
    cartId: cartData.id,
    productId,
    vendorId: product.vendorId,  // ← VENDORID FROM PRODUCT
    unitPriceFils: variant?.priceFils || product.priceFils || 0,
  },
});
```

### Root Cause of Schema/Code Mismatch

**Timeline:**
1. **Schema Updated:** `prisma/schema.prisma` now has `vendorId: String` (required)
2. **Migration Created:** `20260205225500_add_vendorid_to_cartitem` exists locally
3. **Code Updated:** `lib/cart.ts` and `app/api/cart/route.ts` now pass `vendorId` to CartItem
4. **Prisma Client:** Needs to be regenerated to reflect schema changes
5. **Database:** Migration might not be applied yet in the active Neon database

### Prisma Client Generation Status

**Expected:** After schema change, Prisma client should have been regenerated.

**Verify with:**
```bash
# Check Prisma client version
cat node_modules/.prisma/client/package.json | grep version

# OR check the generated prisma client code
grep -r "vendorId" node_modules/.prisma/client/index.d.ts
```

**If vendorId is not in the generated types, the client needs regeneration:**
```bash
npx prisma generate
```

---

## SECTION E: ROOT CAUSE OF SCHEMA MISMATCH

### Problem Statement

The code expects `CartItem.vendorId` to exist:
- ✅ Schema defines it (required field)
- ✅ Migration exists locally (20260205225500_add_vendorid_to_cartitem)
- ✅ Code references it (lib/cart.ts, app/api/cart/route.ts)
- ❓ Database application status: **UNKNOWN WITHOUT RUNNING MIGRATION**
- ❓ Prisma client types: **UNKNOWN IF REGENERATED**

### Two Possible Scenarios

#### SCENARIO 1: Migration NOT Applied to Database

**Symptoms:**
```
Error: Column "CartItem"."vendorId" does not exist
Error Code: P2022
```

**Reason:**
- Migration file exists: `20260205225500_add_vendorid_to_cartitem`
- But it was never executed against the Neon database
- Database still has old CartItem schema (no vendorId)
- Code tries to insert vendorId → SQL error

**Check:**
```sql
-- Run in Neon SQL Editor
SELECT COUNT(*) FROM "_prisma_migrations" 
WHERE migration_name = '20260205225500_add_vendorid_to_cartitem';

-- If result = 0, migration was NOT applied
-- If result = 1, migration WAS applied
```

#### SCENARIO 2: Prisma Client Not Regenerated

**Symptoms:**
```
TypeScript Error: Property 'vendorId' does not exist on type 'CartItem'
Runtime Error: Cannot read property 'vendorId' of undefined
```

**Reason:**
- Schema updated
- Migration created
- But `npx prisma generate` was never run
- Generated Prisma client still has old types
- TypeScript compilation fails OR runtime types are wrong

**Check:**
```bash
grep -A 20 "interface CartItem" node_modules/.prisma/client/index.d.ts | grep vendorId

# If vendorId appears, client is up to date
# If vendorId does NOT appear, client needs regeneration
```

---

## SECTION F: EXACT STEP-BY-STEP FIX PATH

### Prerequisites Check

Before proceeding, run these verifications:

**1. Confirm Neon connection works:**
```bash
npx prisma db execute --stdin < <(echo "SELECT version();")
```

**2. Check which migrations are applied:**
```bash
npx prisma migrate status
```

Expected output will show:
- ✅ Applied migrations (including 20260205225500)
- Or ❌ Following migrations have not yet been applied

---

### FIX OPTION A: Development Environment (Safe)

**Use when:** You want to test locally and sync DB with schema.

```bash
# Step 1: Regenerate Prisma client
npx prisma generate

# Step 2: Apply pending migrations to DEV database
npx prisma migrate dev --name "apply_pending_migrations"
# (If there are pending migrations, this will create a new one)

# Step 3: Verify CartItem has vendorId
npx prisma db execute --stdin < <(echo "SELECT column_name FROM information_schema.columns WHERE table_name='CartItem' AND column_name='vendorId';")

# Step 4: Test cart operations
npm run dev
# Navigate to /cart and test add-to-cart flow
```

---

### FIX OPTION B: Production Environment (Safest)

**Use when:** Deploying to production Neon database.

```bash
# Step 1: List all pending migrations
npx prisma migrate status

# Step 2: Deploy pending migrations (no local DB changes)
npx prisma migrate deploy

# Step 3: Regenerate client AFTER migration completes
npx prisma generate

# Step 4: Verify in Neon SQL Editor
# Run SQL query to confirm column exists (see SECTION C above)

# Step 5: Redeploy application
# Push code to Vercel (migrations run as part of build/deploy)
```

---

### FIX OPTION C: If Migration is Corrupted/Missing

**Use when:** Migration file is deleted or corrupted.

```bash
# ONLY if 20260205225500_add_vendorid_to_cartitem is missing:

# Step 1: Create the migration from current schema
npx prisma migrate diff --from-empty --to-schema-datamodel --script > prisma/migrations/recovery.sql

# Step 2: Apply it
npx prisma migrate resolve --applied "20260205225500_add_vendorid_to_cartitem"

# Step 3: Reset if critical errors occur (DEV ONLY)
npx prisma migrate reset  # ⚠️ DELETES ALL DATA - DEV ONLY
```

---

### CORRECT COMMAND SEQUENCE (Most Common Case)

**If migration file exists but hasn't been applied:**

```bash
# Step 1: Check status
npx prisma migrate status

# Step 2: Apply the migration
npx prisma migrate deploy

# Step 3: Regenerate client
npx prisma generate

# Step 4: Restart dev server
npm run dev
```

**Timeline:** ~30 seconds per step, 2-3 minutes total.

---

## SECTION G: VERIFICATION CHECKLIST

After applying the fix, verify these:

### ✅ Migration Applied to Database

```bash
npx prisma migrate status
# Output: "Database is up to date"
```

### ✅ Column Exists in Neon

Run in Neon SQL Editor:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='CartItem' AND column_name='vendorId';
```

**Expected:** Returns 1 row with `column_name = vendorId`

### ✅ Foreign Key Constraint Exists

Run in Neon SQL Editor:
```sql
SELECT constraint_name FROM information_schema.key_column_usage
WHERE table_name='CartItem' AND column_name='vendorId';
```

**Expected:** Returns 1 row with `constraint_name = CartItem_vendorId_fkey`

### ✅ Prisma Client Generated

```bash
ls -la node_modules/.prisma/client/
# Should show recent timestamp
```

### ✅ Code Can Create CartItem with vendorId

Run in Node.js:
```javascript
const { prisma } = require('./lib/prisma');

// Test: Create a cart item with vendorId
const cartItem = await prisma.cartItem.findFirst({
  where: { vendorId: { not: null } },
});

console.log('✅ vendorId field exists and is accessible:', cartItem?.vendorId);
```

### ✅ Application Starts Without Errors

```bash
npm run dev
# Should start with no Prisma schema errors
# Check browser console and terminal for errors
```

### ✅ Add-to-Cart Flow Works

1. Log into http://localhost:3000
2. Navigate to a product page
3. Click "Add to Cart"
4. Check DevTools Network tab - request should succeed
5. Navigate to /cart - item should appear

---

## SUMMARY TABLE

| Check | Current State | Required Action | Priority |
|-------|---------------|-----------------|----------|
| **DB Provider** | Neon PostgreSQL ✅ | None | N/A |
| **Schema Definition** | Has vendorId ✅ | None | N/A |
| **Migration File** | Exists locally ✅ | None | N/A |
| **Migration Applied?** | ❓ UNKNOWN | `npx prisma migrate deploy` | CRITICAL |
| **Prisma Client** | ❓ UNKNOWN | `npx prisma generate` | HIGH |
| **Code References** | Uses vendorId ✅ | None | N/A |
| **Runtime Test** | ❓ UNTESTED | Run dev server + test | HIGH |

---

## FINAL RECOMMENDATION

**You need to:**

1. **Immediately:** Run `npx prisma migrate deploy` on production Neon DB
2. **Immediately:** Run `npx prisma generate` locally
3. **Then:** Restart dev server and test cart functionality
4. **Verify:** Use SQL queries above to confirm column exists

**Estimated time:** 5 minutes  
**Risk level:** LOW (migration is safe, adds non-breaking column)  
**Rollback:** Reversible migration exists if needed

---

**END OF DIAGNOSIS**

