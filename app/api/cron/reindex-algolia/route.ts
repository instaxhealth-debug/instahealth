import { NextResponse } from "next/server";
import { reindexAllProducts } from "@/server/services/algolia";

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reindexAllProducts();
  return NextResponse.json({
    ok: true,
    count: result.count,
    durationMs: result.duration,
  });
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reindexAllProducts();
  return NextResponse.json({
    ok: true,
    count: result.count,
    durationMs: result.duration,
  });
}