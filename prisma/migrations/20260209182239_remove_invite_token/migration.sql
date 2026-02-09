/*
  Warnings:

  - You are about to drop the `InviteToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InviteToken" DROP CONSTRAINT "InviteToken_vendorApplicationId_fkey";

-- DropTable
DROP TABLE "InviteToken";
