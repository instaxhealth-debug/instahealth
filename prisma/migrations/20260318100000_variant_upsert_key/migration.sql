-- Add composite unique constraint for variant-based upsert
-- This allows one Product row per Shopify variant (not per product)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'vendorId_externalVariantId'
    ) THEN
        ALTER TABLE "Product" ADD CONSTRAINT "vendorId_externalVariantId" UNIQUE ("vendorId", "externalVariantId");
    END IF;
END $$;
