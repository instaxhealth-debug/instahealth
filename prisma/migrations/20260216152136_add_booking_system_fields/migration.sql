/*
  Warnings:

  - You are about to drop the column `calendlyUrl` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "calendlyUrl",
ADD COLUMN     "bookingUrl" TEXT,
ADD COLUMN     "durationMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "bookingUrl" TEXT;
