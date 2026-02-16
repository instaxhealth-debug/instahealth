-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE INDEX "Product_featured_idx" ON "Product"("featured");
