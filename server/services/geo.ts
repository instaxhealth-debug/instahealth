import "server-only";

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @returns distance in kilometers
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export type GeoError =
  | { code: "VENDOR_BASE_NOT_SET"; message: string }
  | { code: "OUT_OF_RADIUS"; distanceKm: number; radiusKm: number; message: string };

/**
 * Assert that an address is within a vendor's service radius
 * Throws GeoError if validation fails
 */
export function assertAddressInVendorRadius(params: {
  vendor: {
    id: string;
    name: string;
    enforceServiceRadius: boolean;
    baseLat: number | null;
    baseLng: number | null;
    serviceRadiusKm: number;
    allowOutOfRadiusOverride: boolean;
  };
  addressLat: number;
  addressLng: number;
  isAdminOverride?: boolean;
}): void {
  const { vendor, addressLat, addressLng, isAdminOverride = false } = params;

  // If enforcement is disabled, allow
  if (!vendor.enforceServiceRadius) {
    return;
  }

  // If enforcement enabled but base coords missing, block
  if (vendor.baseLat === null || vendor.baseLng === null) {
    const error: GeoError = {
      code: "VENDOR_BASE_NOT_SET",
      message: `Vendor "${vendor.name}" has service radius enforcement enabled but no base location set`,
    };
    throw error;
  }

  // Calculate distance
  const distanceKm = haversineKm(
    vendor.baseLat,
    vendor.baseLng,
    addressLat,
    addressLng
  );

  // Check if within radius
  if (distanceKm > vendor.serviceRadiusKm) {
    // Allow override if permitted and admin override is set
    if (vendor.allowOutOfRadiusOverride && isAdminOverride) {
      return;
    }

    const error: GeoError = {
      code: "OUT_OF_RADIUS",
      distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
      radiusKm: vendor.serviceRadiusKm,
      message: `Address is ${Math.round(distanceKm)} km from vendor base, exceeds ${vendor.serviceRadiusKm} km service radius`,
    };
    throw error;
  }
}

/**
 * Simple hash function for address deduplication
 * Combines formatted address, postal code, and country (lowercased and trimmed)
 */
export function createNormalizedAddressHash(
  formattedAddress: string,
  postalCode: string | null,
  country: string | null
): string {
  const normalized = [
    formattedAddress.toLowerCase().trim(),
    (postalCode || "").toLowerCase().trim(),
    (country || "").toLowerCase().trim(),
  ]
    .filter(Boolean)
    .join("|");

  // Simple hash - for production, consider a crypto hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `addr_${Math.abs(hash).toString(36)}`;
}
