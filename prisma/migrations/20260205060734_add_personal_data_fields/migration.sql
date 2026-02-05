-- AlterTable
ALTER TABLE "User" ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "marketingEmailOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingPushOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weightKg" INTEGER;
