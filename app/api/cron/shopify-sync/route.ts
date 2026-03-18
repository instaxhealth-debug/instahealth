/**
 * Shopify Sync Cron Route
 *
 * API endpoint for scheduled background syncs
 * Can be called by Vercel Cron or external schedulers
 */

import { GET as shopifySyncCron } from "@/lib/cron/shopify-sync";

// Re-export the cron handler
export { shopifySyncCron as GET };

// Vercel Cron configuration
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max execution time
