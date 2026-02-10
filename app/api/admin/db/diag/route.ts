import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import crypto from "crypto";

function parseDatabaseUrl(urlString: string | undefined) {
  if (!urlString) {
    return { dbHost: null, dbName: null, dbSchema: null };
  }

  try {
    const parsed = new URL(urlString);
    const dbName = parsed.pathname.replace(/^\//, "") || null;
    const dbSchema = parsed.searchParams.get("schema");
    const dbHost = parsed.host || null;

    return { dbHost, dbName, dbSchema };
  } catch {
    return { dbHost: null, dbName: null, dbSchema: null };
  }
}

export async function GET() {
  await requireAdmin();

  const requestId = crypto.randomUUID();
  const nodeEnv = process.env.NODE_ENV || "unknown";
  const isVercel = Boolean(process.env.VERCEL);
  const { dbHost, dbName, dbSchema } = parseDatabaseUrl(process.env.DATABASE_URL);

  const [
    vendorCount,
    productCount,
    vendorAppCount,
    inviteCount,
  ] = await Promise.all([
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.vendorApplication.count(),
    prisma.vendorInvite.count(),
  ]);

  return NextResponse.json({
    ok: true,
    requestId,
    nodeEnv,
    isVercel,
    dbHost,
    dbName,
    dbSchema,
    vendorCount,
    productCount,
    vendorAppCount,
    inviteCount,
  });
}
