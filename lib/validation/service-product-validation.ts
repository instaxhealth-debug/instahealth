/**
 * Service Product Validation
 *
 * Enforces booking URL requirements for active service products
 * at both product and vendor levels.
 */

import { prisma } from "@/lib/prisma";
import { isServiceCategory, isValidBookingUrl } from "@/lib/vendor-categories";

export interface ServiceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a service product has required bookingUrl
 * Either at product level OR vendor level
 */
export async function validateServiceProduct(params: {
  category: string;
  active: boolean;
  bookingUrl: string | null;
  vendorId: string;
}): Promise<ServiceValidationResult> {
  const { category, active, bookingUrl, vendorId } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Only validate if this is a service category
  if (!isServiceCategory(category)) {
    return { isValid: true, errors, warnings };
  }

  // If product is inactive, no validation needed
  if (!active) {
    return { isValid: true, errors, warnings };
  }

  // Check product-level bookingUrl first
  if (bookingUrl) {
    if (!isValidBookingUrl(bookingUrl)) {
      errors.push("bookingUrl must be a valid HTTPS URL (Calendly, Acuity, Fresha, Square, or generic HTTPS)");
      return { isValid: false, errors, warnings };
    }
    return { isValid: true, errors, warnings };
  }

  // Product doesn't have bookingUrl, check vendor level
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { bookingUrl: true, name: true },
  });

  if (!vendor) {
    errors.push("Vendor not found");
    return { isValid: false, errors, warnings };
  }

  if (!vendor.bookingUrl) {
    errors.push(
      `Active services require a bookingUrl at product or vendor level. ` +
      `Set bookingUrl in Vendor Settings to activate services.`
    );
    return { isValid: false, errors, warnings };
  }

  if (!isValidBookingUrl(vendor.bookingUrl)) {
    errors.push(
      `Vendor bookingUrl is invalid. Update it in Vendor Settings to a valid HTTPS URL.`
    );
    return { isValid: false, errors, warnings };
  }

  return { isValid: true, errors, warnings };
}

/**
 * Validate that a vendor can activate service products
 * Checks if vendor has valid bookingUrl configured
 */
export async function validateVendorCanActivateServices(
  vendorId: string
): Promise<ServiceValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      bookingUrl: true,
      allowedCategories: true,
    },
  });

  if (!vendor) {
    errors.push("Vendor not found");
    return { isValid: false, errors, warnings };
  }

  // Check if vendor has any service categories
  const hasServiceCategories = vendor.allowedCategories.some(cat =>
    isServiceCategory(cat)
  );

  if (!hasServiceCategories) {
    // Vendor doesn't sell services, no validation needed
    return { isValid: true, errors, warnings };
  }

  // Vendor sells services, must have bookingUrl
  if (!vendor.bookingUrl) {
    errors.push(
      "Your vendor profile must have a bookingUrl to activate service products. " +
      "Please add a booking URL in Vendor Settings."
    );
    return { isValid: false, errors, warnings };
  }

  if (!isValidBookingUrl(vendor.bookingUrl)) {
    errors.push(
      "Your vendor bookingUrl is invalid. It must be a valid HTTPS URL."
    );
    return { isValid: false, errors, warnings };
  }

  return { isValid: true, errors, warnings };
}

/**
 * Check if product can be activated
 * Returns user-friendly error message if not
 */
export async function canActivateProduct(params: {
  productId: string;
  active: boolean;
}): Promise<{ canActivate: boolean; reason?: string }> {
  const { productId, active } = params;

  // If deactivating, always allow
  if (!active) {
    return { canActivate: true };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      category: true,
      bookingUrl: true,
      vendorId: true,
      vendor: {
        select: { bookingUrl: true },
      },
    },
  });

  if (!product) {
    return { canActivate: false, reason: "Product not found" };
  }

  // Only validate service products
  if (!isServiceCategory(product.category)) {
    return { canActivate: true };
  }

  // Check if product OR vendor has bookingUrl
  const hasBookingUrl = !!(product.bookingUrl || product.vendor.bookingUrl);

  if (!hasBookingUrl) {
    return {
      canActivate: false,
      reason:
        "Active services require a bookingUrl. Add one at product level or set a default in Vendor Settings.",
    };
  }

  // Validate the URL
  const urlToValidate = product.bookingUrl || product.vendor.bookingUrl;
  if (urlToValidate && !isValidBookingUrl(urlToValidate)) {
    return {
      canActivate: false,
      reason: "The bookingUrl is invalid. It must be a valid HTTPS URL.",
    };
  }

  return { canActivate: true };
}
