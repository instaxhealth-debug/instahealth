-- AlterTable
ALTER TABLE "User" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "VendorApplication" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "legalBusinessName" TEXT NOT NULL,
    "tradingName" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "businessRegNumber" TEXT NOT NULL,
    "taxVatNumber" TEXT,
    "website" TEXT,
    "businessCategory" TEXT NOT NULL,
    "businessDescription" TEXT NOT NULL,
    "contactFullName" TEXT NOT NULL,
    "contactRole" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactWhatsApp" TEXT,
    "preferredContactMethod" TEXT NOT NULL,
    "operationRegion" TEXT NOT NULL,
    "fulfillmentType" TEXT NOT NULL,
    "deliveryTimeframe" TEXT NOT NULL,
    "hasProductImages" BOOLEAN NOT NULL DEFAULT false,
    "complianceDocs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productDescription" TEXT NOT NULL,
    "skuCount" INTEGER,
    "hasPricing" BOOLEAN NOT NULL DEFAULT false,
    "informationAccuracy" BOOLEAN NOT NULL DEFAULT false,
    "agreeContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "approvedVendorId" TEXT,

    CONSTRAINT "VendorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "vendorApplicationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdVendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_approvedVendorId_key" ON "VendorApplication"("approvedVendorId");

-- CreateIndex
CREATE INDEX "VendorApplication_status_idx" ON "VendorApplication"("status");

-- CreateIndex
CREATE INDEX "VendorApplication_createdAt_idx" ON "VendorApplication"("createdAt");

-- CreateIndex
CREATE INDEX "VendorApplication_contactEmail_idx" ON "VendorApplication"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_tokenHash_key" ON "InviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InviteToken_email_idx" ON "InviteToken"("email");

-- CreateIndex
CREATE INDEX "InviteToken_expiresAt_idx" ON "InviteToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_approvedVendorId_fkey" FOREIGN KEY ("approvedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_vendorApplicationId_fkey" FOREIGN KEY ("vendorApplicationId") REFERENCES "VendorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
