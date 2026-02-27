import { NextResponse } from "next/server";

/**
 * GET /api/debug/blob
 *
 * Debug endpoint to check Vercel Blob configuration
 * DO NOT expose the actual token value
 */
export async function GET() {
  return NextResponse.json({
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    runtimeEnv: process.env.VERCEL_ENV || "local",
    nodeEnv: process.env.NODE_ENV || "development",
  });
}
