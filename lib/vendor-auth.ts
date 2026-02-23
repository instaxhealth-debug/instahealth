/**
 * VENDOR PORTAL AUTHENTICATION & AUTHORIZATION
 * Single source of truth for vendor access control
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export interface VendorContext {
  userId: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  role: string;
  email: string;
  allowedCategories: string[];
}

/**
 * getVendorContext: Strict vendor authentication guard
 *
 * RULES:
 * 1. User must be authenticated
 * 2. User role must be VENDOR or ADMIN
 * 3. User must be mapped to exactly ONE Vendor record via Vendor.userId
 * 4. Vendor must have status="active"
 *
 * THROWS: Redirects to /login if unauthorized
 * RETURNS: VendorContext with userId, vendorId, slug, role
 */
export async function getVendorContext(): Promise<VendorContext> {
  const session = await auth();

  // Rule 1: Must be authenticated
  if (!session?.user?.id || !session?.user?.email) {
    console.log("[VENDOR_AUTH] No session - redirecting to login");
    redirect("/login");
  }

  const userId = session.user.id;
  const userEmail = session.user.email;
  const userRole = session.user.role || "USER";

  // Rule 2: Must be VENDOR or ADMIN role
  if (userRole !== "VENDOR" && userRole !== "ADMIN") {
    console.log("[VENDOR_AUTH] Access denied - role is not VENDOR or ADMIN:", userRole);
    redirect("/login?error=vendor_access_denied");
  }

  // Rule 3: User must be mapped to exactly ONE Vendor
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      verified: true,
      allowedCategories: true,
    },
  });

  if (!vendor) {
    console.log("[VENDOR_AUTH] No vendor found for userId:", userId);
    redirect("/login?error=vendor_not_found");
  }

  // Rule 4: Vendor must be active
  if (vendor.status !== "active") {
    console.log("[VENDOR_AUTH] Vendor is not active:", vendor.status);
    redirect("/login?error=vendor_inactive");
  }

  console.log("[VENDOR_AUTH] ✓ Access granted", {
    userId,
    vendorId: vendor.id,
    vendorSlug: vendor.slug,
    role: userRole,
  });

  return {
    userId,
    vendorId: vendor.id,
    vendorSlug: vendor.slug,
    vendorName: vendor.name,
    role: userRole,
    email: userEmail,
    allowedCategories: vendor.allowedCategories || [],
  };
}

/**
 * Validate image URL for vendor settings
 * REJECT: file://, /Users/, local absolute paths
 * ALLOW: https://, http://, /vendors/, /products/, /logos/, /images/
 * NORMALIZE: full URLs to relative public paths when possible
 */
export function validateImageUrl(
  url: string | null | undefined
): { valid: boolean; error?: string; normalizedUrl?: string } {
  if (!url || url.trim() === "") {
    return { valid: true }; // Empty is allowed (nullable field)
  }

  const trimmed = url.trim();

  // Reject file:// protocol
  if (trimmed.startsWith("file://")) {
    return { valid: false, error: "File URLs are not allowed. Use web URLs (https://) or relative paths (/logos/)." };
  }

  // Reject absolute local paths
  if (trimmed.startsWith("/Users/") || trimmed.startsWith("/home/") || trimmed.match(/^[A-Z]:\\/)) {
    return { valid: false, error: "Local file system paths are not allowed. Use web URLs or relative web paths." };
  }

  const allowedPrefixes = ["/vendors/", "/products/", "/logos/", "/images/"];

  // Normalize full URLs to relative public paths when possible
  const fullUrlMatch = trimmed.match(/^https?:\/\/[^/]+(\/.*)$/i);
  if (fullUrlMatch) {
    const path = fullUrlMatch[1];
    if (allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
      return { valid: true, normalizedUrl: path };
    }
    return { valid: true }; // external https URL allowed
  }

  // Allow relative web paths starting with approved prefixes
  if (allowedPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return { valid: true, normalizedUrl: trimmed };
  }

  return {
    valid: false,
    error:
      "Invalid URL format. Use https:// URLs or public paths like /vendors/, /products/, /logos/, /images/",
  };
}

/**
 * getVendorSession: Non-redirecting vendor session getter
 * Returns vendor context or null if not authenticated/authorized
 * Use this in API routes where you want to handle auth failures manually
 */
export async function getVendorSession(): Promise<VendorContext | null> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return null;
  }

  const userId = session.user.id;
  const userEmail = session.user.email;
  const userRole = session.user.role || "USER";

  if (userRole !== "VENDOR" && userRole !== "ADMIN") {
    return null;
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      allowedCategories: true,
    },
  });

  if (!vendor || vendor.status !== "active") {
    return null;
  }

  return {
    userId,
    vendorId: vendor.id,
    vendorSlug: vendor.slug,
    vendorName: vendor.name,
    role: userRole,
    email: userEmail,
    allowedCategories: vendor.allowedCategories || [],
  };
}
