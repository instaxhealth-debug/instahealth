ALTER TABLE "VendorApplication"
ADD COLUMN "inviteEmailError" TEXT,
ADD COLUMN "inviteEmailMessageId" TEXT,
ADD COLUMN "inviteEmailSentAt" TIMESTAMP(3),
ADD COLUMN "inviteEmailStatus" "ConfirmationEmailStatus" NOT NULL DEFAULT 'PENDING';
