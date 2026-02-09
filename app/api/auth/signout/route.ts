import { signOut } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await signOut({ redirect: false });

  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/login";
  return NextResponse.redirect(new URL(callbackUrl, request.url));
}

export async function POST(request: NextRequest) {
  await signOut({ redirect: false });

  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/login";
  return NextResponse.json({ success: true, callbackUrl });
}
