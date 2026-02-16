/**
 * Phone number normalization and validation utilities
 * Uses E.164 international format for storage
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Normalize country input to ISO 3166-1 alpha-2 code
 * @param country - Country name or code
 * @returns ISO alpha-2 code or "AE" as default
 */
export function normalizeCountryCode(country: string | undefined): 'AE' {
  if (!country) return 'AE';

  const normalized = country.trim().toUpperCase();

  // UAE variants
  if (
    normalized === 'AE' ||
    normalized === 'UAE' ||
    normalized === 'UNITED ARAB EMIRATES' ||
    normalized.includes('DUBAI') ||
    normalized.includes('ABU DHABI')
  ) {
    return 'AE';
  }

  // Default to AE for Dubai marketplace
  return 'AE';
}

/**
 * Normalize phone number to E.164 format
 * @param phone - Raw phone number input (e.g., "050 123 4567", "+971-50-123-4567")
 * @param country - Country name or code (will be normalized to ISO code)
 * @returns E.164 formatted phone or null if invalid
 *
 * @example
 * normalizePhone("050 123 4567", "United Arab Emirates") // "+971501234567"
 * normalizePhone("+971501234567") // "+971501234567"
 * normalizePhone("invalid") // null
 */
export function normalizePhone(phone: string, country?: string): string | null {
  if (!phone || typeof phone !== 'string') return null;

  const cleaned = phone.trim();
  if (!cleaned) return null;

  const countryCode = normalizeCountryCode(country);

  try {
    // Try parsing with country code
    const phoneNumber = parsePhoneNumber(cleaned, countryCode);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return null;
    }

    // Return E.164 format (e.g., +971501234567)
    return phoneNumber.number;
  } catch (error) {
    // Invalid phone number
    return null;
  }
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @param country - Country name or code
 * @returns true if valid phone number
 */
export function isValidPhone(phone: string, country?: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  const countryCode = normalizeCountryCode(country);

  try {
    return isValidPhoneNumber(phone.trim(), countryCode);
  } catch {
    return false;
  }
}

/**
 * Format phone for display (international format with spaces)
 * @param phone - E.164 phone number
 * @returns Human-readable format (e.g., "+971 50 123 4567")
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';

  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (!phoneNumber) return phone;

    // Format as international with spaces
    return phoneNumber.formatInternational();
  } catch {
    return phone;
  }
}
