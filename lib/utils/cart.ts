/**
 * Cart Utility Functions
 * Centralized helpers for cart item normalization and price handling
 */

import { Decimal } from "@prisma/client/runtime/library";

// Type guards for cart item shapes
export function isDBCartItem(item: any): boolean {
  return item.unitPriceFils !== undefined;
}

export function isLocalCartItem(item: any): boolean {
  return item.product?.price !== undefined;
}

/**
 * Normalize price to AED decimal number
 * Handles Prisma Decimal, priceFils, and plain numbers
 */
export function normalizePriceAED(value: unknown): number {
  if (value === null || value === undefined) {
    console.warn("[normalizePriceAED] Received null/undefined price, returning 0");
    return 0;
  }

  // Handle Prisma Decimal
  if (value instanceof Decimal || (typeof value === "object" && "toNumber" in value)) {
    const num = (value as Decimal).toNumber();
    if (isNaN(num) || !isFinite(num)) {
      console.error("[normalizePriceAED] Invalid Decimal conversion:", value);
      return 0;
    }
    return num;
  }

  // Handle number (already in AED)
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) {
      console.error("[normalizePriceAED] Invalid number:", value);
      return 0;
    }
    return value;
  }

  // Handle string
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
      console.error("[normalizePriceAED] Invalid string price:", value);
      return 0;
    }
    return parsed;
  }

  console.error("[normalizePriceAED] Unsupported price type:", typeof value, value);
  return 0;
}

/**
 * Get price in AED from cart item (handles both DB and local cart)
 * CRITICAL: unitPriceFils currently stores AED directly (not fils), so NO division by 100
 */
export function getCartItemPriceAED(item: any): number {
  if (isDBCartItem(item)) {
    // DB cart item: unitPriceFils currently stores AED directly (NOT fils)
    const priceAED = item.unitPriceFils;
    if (typeof priceAED !== "number" || isNaN(priceAED)) {
      console.error("[getCartItemPriceAED] Invalid unitPriceFils:", priceAED);
      return 0;
    }
    return priceAED;  // Already in AED, no conversion needed
  }

  if (isLocalCartItem(item)) {
    // Local cart item: price in AED directly
    const product = item.product || item;
    const priceAED = item.variant?.price ?? product.price;
    return normalizePriceAED(priceAED);
  }

  console.error("[getCartItemPriceAED] Unknown cart item shape:", item);
  return 0;
}

/**
 * Format price as AED string
 * Safe wrapper around formatPriceAED that handles invalid inputs
 */
export function formatAED(value: unknown): string {
  const aed = normalizePriceAED(value);
  if (aed === 0 && value !== 0) {
    return "AED 0.00"; // Fallback for invalid prices
  }
  return `AED ${aed.toFixed(2)}`;
}

/**
 * Calculate line total for cart item
 */
export function getCartItemLineTotal(item: any): number {
  const unitPrice = getCartItemPriceAED(item);
  const quantity = item.quantity || 0;

  if (quantity < 0) {
    console.warn("[getCartItemLineTotal] Negative quantity:", quantity);
    return 0;
  }

  const lineTotal = unitPrice * quantity;

  if (isNaN(lineTotal) || !isFinite(lineTotal)) {
    console.error("[getCartItemLineTotal] Invalid line total calculation:", {
      unitPrice,
      quantity,
      lineTotal,
    });
    return 0;
  }

  return lineTotal;
}

/**
 * Get product name from cart item (handles both shapes)
 */
export function getCartItemName(item: any): string {
  const product = item.product || item;
  return product.name || "Unknown Product";
}

/**
 * Get product ID from cart item (handles both shapes)
 */
export function getCartItemProductId(item: any): string {
  const product = item.product || item;
  return product.id || "";
}

/**
 * Validate cart item has minimum required fields
 */
export function validateCartItem(item: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!item) {
    errors.push("Item is null or undefined");
    return { valid: false, errors };
  }

  // Check product ID
  const productId = getCartItemProductId(item);
  if (!productId) {
    errors.push("Missing product ID");
  }

  // Check quantity
  const quantity = item.quantity;
  if (typeof quantity !== "number" || quantity < 1 || !Number.isInteger(quantity)) {
    errors.push("Invalid quantity (must be positive integer)");
  }

  // Check price
  const price = getCartItemPriceAED(item);
  if (price <= 0) {
    errors.push("Invalid price (must be positive number)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
