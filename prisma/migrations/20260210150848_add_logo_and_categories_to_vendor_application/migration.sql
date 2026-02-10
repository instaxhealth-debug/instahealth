-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "selectedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
