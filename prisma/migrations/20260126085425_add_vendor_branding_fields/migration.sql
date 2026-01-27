-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "legalEntityName" TEXT,
    "country" TEXT,
    "licenseNumber" TEXT,
    "complianceAccepted" BOOLEAN NOT NULL DEFAULT false,
    "complianceAcceptedAt" DATETIME,
    "logoUrl" TEXT,
    "tagline" TEXT,
    "rating" REAL,
    "ratingCount" INTEGER,
    "isHouseBrand" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Vendor" ("complianceAccepted", "complianceAcceptedAt", "country", "createdAt", "email", "id", "legalEntityName", "licenseNumber", "logoUrl", "name", "slug", "status", "updatedAt") SELECT "complianceAccepted", "complianceAcceptedAt", "country", "createdAt", "email", "id", "legalEntityName", "licenseNumber", "logoUrl", "name", "slug", "status", "updatedAt" FROM "Vendor";
DROP TABLE "Vendor";
ALTER TABLE "new_Vendor" RENAME TO "Vendor";
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");
CREATE UNIQUE INDEX "Vendor_email_key" ON "Vendor"("email");
CREATE INDEX "Vendor_slug_idx" ON "Vendor"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
