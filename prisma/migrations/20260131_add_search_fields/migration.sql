-- Add verified field to Vendor
ALTER TABLE "Vendor" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;

-- Add search-specific fields to Product
ALTER TABLE "Product" ADD COLUMN "inventoryStatus" TEXT NOT NULL DEFAULT 'in_stock';
ALTER TABLE "Product" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Create indexes for search performance
CREATE INDEX "Product_published_idx" ON "Product"("published");
CREATE INDEX "Product_inventoryStatus_idx" ON "Product"("inventoryStatus");
CREATE INDEX "Vendor_verified_idx" ON "Vendor"("verified");
