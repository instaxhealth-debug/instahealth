import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/vendor/login",
  "/vendor/apply",
  "/vendor/activate",
  "/shopify",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Early return for API routes, Next.js internals, and static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Debug logging (dev only)
  if (process.env.NODE_ENV === "development") {
    const isPublic = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    console.log(
      `[MIDDLEWARE] path=${pathname} isPublic=${isPublic} action=next`
    );
  }

  // Redirect legacy /account/* routes to /my-account/*
  if (pathname.startsWith("/account/")) {
    const newPathname = pathname.replace(/^\/account/, "/my-account");
    return NextResponse.redirect(new URL(newPathname, request.url), { status: 307 });
  }

  if (pathname === "/account") {
    return NextResponse.redirect(new URL("/my-account/personal-details", request.url), { status: 307 });
  }

  // Mark vendor auth routes as public (for any downstream middleware or handlers)
  if (pathname.startsWith("/vendor/activate") || pathname.startsWith("/vendor/login") || pathname.startsWith("/vendor/apply")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-public-route", "1");
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // For now, don't gate routes in middleware to avoid Edge/Prisma issues
  // Let server components handle auth checks instead
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
