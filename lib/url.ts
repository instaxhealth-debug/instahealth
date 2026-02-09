export function getBaseUrl(options?: {
  requestId?: string;
  route?: string;
  allowBadBaseUrl?: boolean;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  if (process.env.NODE_ENV === "production" && !options?.allowBadBaseUrl) {
    const isInvalid =
      baseUrl.includes("localhost") ||
      baseUrl.includes(".vercel.app") ||
      !baseUrl.startsWith("https://instahealth.ae");

    if (isInvalid) {
      console.error("[EMAIL_BLOCKED_BAD_BASEURL]", {
        requestId: options?.requestId || null,
        route: options?.route || null,
        baseUrl,
      });
      throw new Error("Invalid baseUrl for production email links");
    }
  }

  return baseUrl;
}

export function redactToken(url: string) {
  return url.replace(/(token=)[^&]+/i, "$1REDACTED");
}
