import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const allCookies = cookies()
    .getAll()
    .map(({ name, value }) => ({ name, value }));

  console.log("[DEBUG] Auth cookies:", allCookies.map((c) => c.name));

  return NextResponse.json({ cookies: allCookies }, { status: 200 });
}
