ALTER TABLE "Product" ADD COLUMN "importKey" TEXT;

CREATE UNIQUE INDEX "Product_vendorId_importKey_key" ON "Product" ("vendorId", "importKey");