-- Add Shopify integration fields to Vendor table
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "shopifyConnected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "shopifyShopDomain" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "shopifyAccessToken" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "shopifyScopes" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "shopifyInstalledAt" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "shopifyLastSyncAt" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "shopifySyncStatus" TEXT;
