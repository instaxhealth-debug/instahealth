import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Invite system deprecated. Use VendorInvite." },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Invite system deprecated. Use VendorInvite." },
    { status: 410 }
  );
}
