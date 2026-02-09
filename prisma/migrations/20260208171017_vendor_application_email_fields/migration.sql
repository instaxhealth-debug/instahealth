/*
  Warnings:

  - The `status` column on the `VendorApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "VendorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConfirmationEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN     "confirmationEmailError" TEXT,
ADD COLUMN     "confirmationEmailMessageId" TEXT,
ADD COLUMN     "confirmationEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationEmailStatus" "ConfirmationEmailStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "status",
ADD COLUMN     "status" "VendorApplicationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "VendorInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "applicationId" TEXT,
    "vendorId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "emailStatus" "ConfirmationEmailStatus" NOT NULL DEFAULT 'PENDING',
    "emailMessageId" TEXT,
    "emailError" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvite_token_key" ON "VendorInvite"("token");

-- CreateIndex
CREATE INDEX "VendorInvite_email_idx" ON "VendorInvite"("email");

-- CreateIndex
CREATE INDEX "VendorInvite_token_idx" ON "VendorInvite"("token");

-- CreateIndex
CREATE INDEX "VendorInvite_expiresAt_idx" ON "VendorInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "VendorInvite_applicationId_idx" ON "VendorInvite"("applicationId");

-- CreateIndex
CREATE INDEX "VendorApplication_status_idx" ON "VendorApplication"("status");
