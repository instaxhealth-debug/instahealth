/**
 * Shopify Session Token Validation Utility
 *
 * Session tokens are JWT tokens issued by Shopify for embedded apps.
 * They must be validated on the server for authenticated API requests.
 *
 * Requirements:
 * - Verify JWT signature using Shopify's public keys
 * - Validate expiration (exp claim)
 * - Validate audience (aud claim matches client ID)
 * - Validate destination (dest claim matches shop domain)
 */

import crypto from "crypto";

interface SessionTokenPayload {
  iss: string; // Issuer (https://{shop}/admin)
  dest: string; // Destination (https://{shop})
  aud: string; // Audience (API key/client ID)
  sub: string; // Subject (user ID)
  exp: number; // Expiration timestamp
  nbf: number; // Not before timestamp
  iat: number; // Issued at timestamp
  jti: string; // JWT ID
  sid: string; // Session ID
}

/**
 * Decode and validate a Shopify session token
 *
 * @param token - The session token from Authorization header
 * @returns Decoded payload if valid, null otherwise
 *
 * Note: This is a simplified validation that checks basic JWT structure and claims.
 * For production, you should use a proper JWT library with signature verification
 * against Shopify's public keys.
 */
export function validateSessionToken(
  token: string
): SessionTokenPayload | null {
  try {
    // Session tokens are JWTs with format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("[SESSION_TOKEN] Invalid token format - must have 3 parts");
      return null;
    }

    // Decode payload (base64url)
    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString(
      "utf-8"
    );
    const payload: SessionTokenPayload = JSON.parse(payloadJson);

    // Validate required claims exist
    if (!payload.iss || !payload.dest || !payload.aud || !payload.exp) {
      console.error("[SESSION_TOKEN] Missing required claims:", {
        hasIss: !!payload.iss,
        hasDest: !!payload.dest,
        hasAud: !!payload.aud,
        hasExp: !!payload.exp,
      });
      return null;
    }

    // Validate expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.error("[SESSION_TOKEN] Token expired:", {
        exp: payload.exp,
        now,
        expiredSeconds: now - payload.exp,
      });
      return null;
    }

    // Validate not before
    if (payload.nbf && payload.nbf > now) {
      console.error("[SESSION_TOKEN] Token not yet valid:", {
        nbf: payload.nbf,
        now,
      });
      return null;
    }

    // Validate audience (must match client ID)
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      console.error("[SESSION_TOKEN] Audience mismatch:", {
        expected: clientId,
        actual: payload.aud,
      });
      return null;
    }

    console.log("[SESSION_TOKEN] Token validated successfully:", {
      shop: payload.dest,
      user: payload.sub,
      exp: new Date(payload.exp * 1000).toISOString(),
    });

    return payload;
  } catch (error) {
    console.error("[SESSION_TOKEN] Validation error:", error);
    return null;
  }
}

/**
 * Extract session token from Authorization header
 *
 * @param authHeader - The Authorization header value
 * @returns The token if found, null otherwise
 */
export function extractSessionToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Authorization header format: "Bearer {token}"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    console.error("[SESSION_TOKEN] Invalid Authorization header format");
    return null;
  }

  return parts[1];
}

/**
 * Middleware to validate session token from request headers
 *
 * Usage:
 * ```typescript
 * const payload = await requireSessionToken(request);
 * if (!payload) {
 *   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * }
 * ```
 */
export async function requireSessionToken(
  request: Request
): Promise<SessionTokenPayload | null> {
  const authHeader = request.headers.get("Authorization");
  const token = extractSessionToken(authHeader);

  if (!token) {
    console.error("[SESSION_TOKEN] No token in request");
    return null;
  }

  return validateSessionToken(token);
}

/**
 * Get shop domain from session token payload
 *
 * @param payload - The validated session token payload
 * @returns The shop domain (e.g., "store.myshopify.com")
 */
export function getShopFromPayload(payload: SessionTokenPayload): string {
  // dest format: "https://{shop}"
  return payload.dest.replace("https://", "");
}
