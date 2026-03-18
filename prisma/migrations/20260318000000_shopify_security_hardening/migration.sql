-- CreateTable: ShopifyOAuthState for secure OAuth nonce storage
CREATE TABLE "ShopifyOAuthState" (
    "nonce" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyOAuthState_pkey" PRIMARY KEY ("nonce")
);

-- CreateIndex
CREATE INDEX "ShopifyOAuthState_createdAt_idx" ON "ShopifyOAuthState"("createdAt");

-- AlterTable: Add Shopify fields to Product for sync integration
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "externalVariantId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT;

-- DropIndex: Remove old unnamed composite unique constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Product_vendorId_externalId_key'
    ) THEN
        ALTER TABLE "Product" DROP CONSTRAINT "Product_vendorId_externalId_key";
    END IF;
END $$;

-- CreateIndex: Add named composite unique constraint for Prisma upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'vendorId_externalId'
    ) THEN
        ALTER TABLE "Product" ADD CONSTRAINT "vendorId_externalId" UNIQUE ("vendorId", "externalId");
    END IF;
END $$;
