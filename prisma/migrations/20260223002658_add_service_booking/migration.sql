-- CreateEnum
CREATE TYPE "ServiceBookingStatus" AS ENUM ('PAYMENT_PENDING', 'PAID_AWAITING_SCHEDULE', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "amountFils" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'aed',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" "ServiceBookingStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "bookingUrlResolved" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "externalBookingRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBooking_stripeCheckoutSessionId_key" ON "ServiceBooking"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBooking_stripePaymentIntentId_key" ON "ServiceBooking"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "ServiceBooking_vendorId_createdAt_idx" ON "ServiceBooking"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceBooking_status_createdAt_idx" ON "ServiceBooking"("status", "createdAt");
