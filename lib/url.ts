export function normalizeBaseUrl(url: string) {
  if (!url) return url;

  let normalized = url.trim();

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);

    if (process.env.NODE_ENV === "production") {
      parsed.protocol = "https:";
    }

    if (parsed.hostname.startsWith("www.")) {
      parsed.hostname = parsed.hostname.replace(/^www\./i, "");
    }

    const finalUrl = parsed.toString().replace(/\/$/, "");
    return finalUrl;
  } catch {
    return normalized.replace(/\/$/, "");
  }
}

export function isValidProductionBaseUrl(baseUrl: string) {
  return normalizeBaseUrl(baseUrl) === "https://instahealth.ae";
}

export function getBaseUrl(options?: {
  requestId?: string;
  route?: string;
  allowBadBaseUrl?: boolean;
}) {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const normalizedBaseUrl = normalizeBaseUrl(rawBaseUrl);

  if (process.env.NODE_ENV === "production" && !options?.allowBadBaseUrl) {
    const isInvalid = !isValidProductionBaseUrl(normalizedBaseUrl);

    if (isInvalid) {
      console.error("[EMAIL_BLOCKED_BAD_BASEURL]", {
        requestId: options?.requestId || null,
        route: options?.route || null,
        baseUrl: normalizedBaseUrl,
      });
    }
  }

  return normalizedBaseUrl;
}

export function redactToken(url: string) {
  return url.replace(/(token=)[^&]+/i, "$1REDACTED");
}
