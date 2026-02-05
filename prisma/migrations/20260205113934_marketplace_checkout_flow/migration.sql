/*
  Warnings:

  - The values [PENDING_ACCEPTANCE,PREPARING,OUT_FOR_DELIVERY,DELIVERED,CANCELLED_BY_VENDOR] on the enum `VendorOrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VendorOrderStatus_new" AS ENUM ('NEW', 'READY_FOR_FULFILLMENT', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED');
ALTER TABLE "public"."VendorOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VendorOrder" ALTER COLUMN "status" TYPE "VendorOrderStatus_new" USING ("status"::text::"VendorOrderStatus_new");
ALTER TYPE "VendorOrderStatus" RENAME TO "VendorOrderStatus_old";
ALTER TYPE "VendorOrderStatus_new" RENAME TO "VendorOrderStatus";
DROP TYPE "public"."VendorOrderStatus_old";
ALTER TABLE "VendorOrder" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "shippingArea" TEXT,
ADD COLUMN     "shippingEmirate" TEXT;

-- AlterTable
ALTER TABLE "VendorOrder" ADD COLUMN     "subtotalFils" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalFils" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
