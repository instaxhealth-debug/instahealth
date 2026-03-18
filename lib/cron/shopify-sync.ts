/**
 * Shopify Background Sync Cron Job
 *
 * Runs daily to sync all Shopify-connected vendors
 * Reconciles missing products and fixes drift
 * ✅ FIX: Error accumulation and alerting for production visibility
 */

import { prisma } from "@/lib/prisma";
import { syncShopifyProducts } from "@/lib/shopify/sync-service";

/**
 * ✅ FIX: Alert admins when critical errors occur during cron execution
 */
async function alertAdminOfCronFailures(failures: Array<{ vendorName: string; error: string }>) {
  // In production, send to monitoring service (e.g., Sentry, Datadog, PagerDuty)
  // For now, log prominently with structured format for log aggregation

  if (failures.length === 0) return;

  const errorReport = {
    timestamp: new Date().toISOString(),
    service: "shopify-sync-cron",
    severity: "ERROR",
    failureCount: failures.length,
    failures: failures.map((f) => ({
      vendor: f.vendorName,
      error: f.error,
    })),
  };

  console.error("[ALERT] Shopify sync cron failures:", JSON.stringify(errorReport, null, 2));

  // TODO: In production, integrate with:
  // - await sendSlackAlert(errorReport);
  // - await sendEmailToAdmins(errorReport);
  // - Sentry.captureException(new Error("Shopify sync failures"), { extra: errorReport });
}

export async function runShopifySyncCron() {
  console.log("[Shopify Sync Cron] Starting background sync...");

  try {
    // ✅ FIX: Clean up stale OAuth nonces (older than 1 day)
    try {
      const deleted = await prisma.shopifyOAuthState.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });
      if (deleted.count > 0) {
        console.log(`[Shopify Sync Cron] Cleaned up ${deleted.count} stale OAuth nonces`);
      }
    } catch (nonceCleanupError) {
      console.error("[Shopify Sync Cron] Nonce cleanup error:", nonceCleanupError);
      // Don't fail entire cron if nonce cleanup fails
    }

    // Find all vendors with Shopify connected
    const vendors = await prisma.vendor.findMany({
      where: {
        shopifyConnected: true,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        shopifyShopDomain: true,
      },
    });

    console.log(`[Shopify Sync Cron] Found ${vendors.length} connected vendors`);

    const results = [];
    // ✅ FIX: Accumulate failures for alerting
    const failures: Array<{ vendorName: string; error: string }> = [];

    // Sync each vendor sequentially to avoid rate limits
    for (const vendor of vendors) {
      console.log(`[Shopify Sync Cron] Syncing vendor: ${vendor.name} (${vendor.shopifyShopDomain})`);

      try {
        const result = await syncShopifyProducts(vendor.id);

        // ✅ FIX: Track failures even if sync doesn't throw
        if (!result.success && result.errors.length > 0) {
          failures.push({
            vendorName: vendor.name,
            error: result.errors.join("; "),
          });
        }

        results.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          success: result.success,
          stats: {
            processed: result.productsProcessed,
            created: result.productsCreated,
            updated: result.productsUpdated,
            skipped: result.productsSkipped,
            errors: result.errors.length,
          },
          errorDetails: result.errors.length > 0 ? result.errors : undefined,
        });

        console.log(
          `[Shopify Sync Cron] Completed sync for ${vendor.name}: ` +
          `${result.productsCreated} created, ${result.productsUpdated} updated, ` +
          `${result.productsSkipped} skipped, ${result.errors.length} errors`
        );

        // Add delay between vendors to respect Shopify rate limits (2 req/sec)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Shopify Sync Cron] Failed to sync vendor ${vendor.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // ✅ FIX: Track catastrophic failures
        failures.push({
          vendorName: vendor.name,
          error: errorMessage,
        });

        results.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          success: false,
          error: errorMessage,
        });
      }
    }

    console.log("[Shopify Sync Cron] Background sync completed");
    console.log(
      `[Shopify Sync Cron] Summary: ${results.filter((r) => r.success).length}/${results.length} vendors synced successfully`
    );

    // ✅ FIX: Alert admins if any vendors failed
    if (failures.length > 0) {
      await alertAdminOfCronFailures(failures);
    }

    return {
      success: failures.length === 0, // ✅ FIX: Report failure if any vendor failed
      vendorCount: vendors.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: failures.length,
      results,
    };
  } catch (error) {
    console.error("[Shopify Sync Cron] Fatal error:", error);

    // ✅ FIX: Alert on catastrophic cron failure
    await alertAdminOfCronFailures([
      {
        vendorName: "ALL VENDORS",
        error: error instanceof Error ? error.message : String(error),
      },
    ]);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Vercel Cron API route handler
export async function GET() {
  const result = await runShopifySyncCron();

  return Response.json(result, {
    status: result.success ? 200 : 500,
  });
}
