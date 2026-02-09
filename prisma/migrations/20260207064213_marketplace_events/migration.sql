-- CreateEnum
CREATE TYPE "MarketplaceEventType" AS ENUM ('VIEW', 'ADD_TO_CART', 'BOOK_CLICK', 'PURCHASE');

-- CreateTable
CREATE TABLE "MarketplaceEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "eventType" "MarketplaceEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceEvent_createdAt_idx" ON "MarketplaceEvent"("createdAt");
