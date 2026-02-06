-- Add vendorId column to CartItem (required for correct checkout flow)
-- This migration adds vendor ownership tracking to cart items

-- Step 1: Add column as nullable first (to allow existing rows)
ALTER TABLE "CartItem" ADD COLUMN "vendorId" TEXT;

-- Step 2: Backfill vendorId from product.vendorId for existing cart items
UPDATE "CartItem"
SET "vendorId" = "Product"."vendorId"
FROM "Product"
WHERE "CartItem"."productId" = "Product"."id"
  AND "CartItem"."vendorId" IS NULL;

-- Step 3: Delete any cart items where product no longer exists (orphaned items)
DELETE FROM "CartItem"
WHERE "vendorId" IS NULL;

-- Step 4: Make vendorId required (NOT NULL)
ALTER TABLE "CartItem" ALTER COLUMN "vendorId" SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add index for performance
CREATE INDEX "CartItem_vendorId_idx" ON "CartItem"("vendorId");
