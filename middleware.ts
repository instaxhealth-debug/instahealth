import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // Redirect legacy /account/* routes to /my-account/*
  if (pathname.startsWith("/account/")) {
    const newPathname = pathname.replace(/^\/account/, "/my-account");
    return NextResponse.redirect(new URL(newPathname, request.url), { status: 307 });
  }

  if (pathname === "/account") {
    return NextResponse.redirect(new URL("/my-account/personal-details", request.url), { status: 307 });
  }

  // For now, don't gate routes in middleware to avoid Edge/Prisma issues
  // Let server components handle auth checks instead
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
