-- Baseline migration to align history with existing Product.sku unique index
-- This migration is intended to be marked as applied without changing live data.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;

DO $$
DECLARE
  idx RECORD;
BEGIN
  FOR idx IN
    SELECT i.relname AS index_name
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a1 ON a1.attrelid = t.oid AND a1.attnum = ix.indkey[0]
    JOIN pg_attribute a2 ON a2.attrelid = t.oid AND a2.attnum = ix.indkey[1]
    WHERE n.nspname = 'public'
      AND t.relname = 'Product'
      AND ix.indisunique
      AND a1.attname = 'vendorId'
      AND a2.attname = 'sku'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', idx.index_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_vendorId_sku_key" ON "Product" ("vendorId", "sku");
