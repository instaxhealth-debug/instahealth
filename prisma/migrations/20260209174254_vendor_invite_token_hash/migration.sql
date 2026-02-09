/*
  Warnings:

  - You are about to drop the column `token` on the `VendorInvite` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenHash]` on the table `VendorInvite` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenHash` to the `VendorInvite` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "VendorInvite_token_idx";

-- DropIndex
DROP INDEX "VendorInvite_token_key";

-- Add nullable tokenHash first
ALTER TABLE "VendorInvite" ADD COLUMN "tokenHash" TEXT;

-- Backfill tokenHash from existing token values
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE "VendorInvite"
SET "tokenHash" = encode(digest("token", 'sha256'), 'hex')
WHERE "token" IS NOT NULL;

-- Enforce not-null after backfill
ALTER TABLE "VendorInvite" ALTER COLUMN "tokenHash" SET NOT NULL;

-- Drop raw token column
ALTER TABLE "VendorInvite" DROP COLUMN "token";

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvite_tokenHash_key" ON "VendorInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "VendorInvite_tokenHash_idx" ON "VendorInvite"("tokenHash");
