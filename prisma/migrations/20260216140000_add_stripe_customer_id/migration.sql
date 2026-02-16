-- Add Stripe Customer ID field to User table
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;

-- Create unique index on stripeCustomerId
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
