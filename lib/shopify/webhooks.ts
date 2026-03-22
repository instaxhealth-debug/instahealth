/**
 * Shopify Webhook Registration Utilities
 *
 * Automatically registers webhooks after OAuth installation
 * Uses Shopify REST Admin API 2024-01
 * Handles duplicates safely (idempotent)
 */

const SHOPIFY_API_VERSION = "2024-01";

/**
 * Webhook topics to register for each vendor
 */
const WEBHOOK_TOPICS = [
  "products/create",
  "products/update",
  "products/delete",
  "app/uninstalled",
] as const;

type WebhookTopic = (typeof WEBHOOK_TOPICS)[number];

interface WebhookRegistrationResult {
  success: boolean;
  registered: string[];
  skipped: string[];
  errors: string[];
}

interface ShopifyWebhook {
  id: number;
  topic: string;
  address: string;
  created_at: string;
  updated_at: string;
  format: string;
  fields: string[];
  metafield_namespaces: string[];
  api_version: string;
}

interface ShopifyWebhooksResponse {
  webhooks: ShopifyWebhook[];
}

interface ShopifyWebhookCreateResponse {
  webhook: ShopifyWebhook;
}

/**
 * Get webhook endpoint URL
 */
function getWebhookUrl(): string {
  // Use production URL if available, fallback to base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://instahealth.ae";

  return `${baseUrl}/api/shopify/webhooks`;
}

/**
 * Fetch existing webhooks from Shopify
 */
async function fetchExistingWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyWebhook[]> {
  const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch webhooks: ${response.status} ${errorText}`
    );
  }

  const data: ShopifyWebhooksResponse = await response.json();
  return data.webhooks || [];
}

/**
 * Create a single webhook
 */
async function createWebhook(
  shopDomain: string,
  accessToken: string,
  topic: WebhookTopic,
  address: string
): Promise<ShopifyWebhook> {
  const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook: {
        topic,
        address,
        format: "json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create webhook for ${topic}: ${response.status} ${errorText}`
    );
  }

  const data: ShopifyWebhookCreateResponse = await response.json();
  return data.webhook;
}

/**
 * Register all required webhooks for a vendor
 * Idempotent - skips webhooks that already exist with same topic + address
 *
 * @param shopDomain - Shop domain (e.g., store.myshopify.com)
 * @param accessToken - Shop access token
 * @returns Registration result with success/skip/error counts
 */
export async function registerWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<WebhookRegistrationResult> {
  const result: WebhookRegistrationResult = {
    success: false,
    registered: [],
    skipped: [],
    errors: [],
  };

  try {
    const webhookUrl = getWebhookUrl();

    console.log(
      `[WEBHOOK_REGISTRATION] Starting webhook registration for ${shopDomain}`
    );
    console.log(`[WEBHOOK_REGISTRATION] Webhook URL: ${webhookUrl}`);

    // Step 1: Fetch existing webhooks
    let existingWebhooks: ShopifyWebhook[] = [];
    try {
      existingWebhooks = await fetchExistingWebhooks(shopDomain, accessToken);
      console.log(
        `[WEBHOOK_REGISTRATION] Found ${existingWebhooks.length} existing webhooks`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[WEBHOOK_REGISTRATION] Failed to fetch existing webhooks: ${errorMessage}`
      );
      result.errors.push(`Failed to fetch existing webhooks: ${errorMessage}`);
      // Continue anyway - try to create webhooks
    }

    // Step 2: Register each webhook topic
    for (const topic of WEBHOOK_TOPICS) {
      try {
        // Check if webhook already exists for this topic + address
        const existingWebhook = existingWebhooks.find(
          (wh) => wh.topic === topic && wh.address === webhookUrl
        );

        if (existingWebhook) {
          console.log(
            `[WEBHOOK_REGISTRATION] Webhook already exists: ${topic} (ID: ${existingWebhook.id})`
          );
          result.skipped.push(topic);
          continue;
        }

        // Create new webhook
        const webhook = await createWebhook(
          shopDomain,
          accessToken,
          topic,
          webhookUrl
        );

        console.log(
          `[WEBHOOK_REGISTRATION] ✅ Registered webhook: ${topic} (ID: ${webhook.id})`
        );
        result.registered.push(topic);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `[WEBHOOK_REGISTRATION] ❌ Failed to register ${topic}: ${errorMessage}`
        );
        result.errors.push(`${topic}: ${errorMessage}`);
      }
    }

    // Step 3: Determine overall success
    result.success =
      result.errors.length === 0 &&
      result.registered.length + result.skipped.length === WEBHOOK_TOPICS.length;

    console.log(`[WEBHOOK_REGISTRATION] ===== REGISTRATION SUMMARY =====`);
    console.log(`[WEBHOOK_REGISTRATION] Shop: ${shopDomain}`);
    console.log(
      `[WEBHOOK_REGISTRATION] Registered: ${result.registered.length} (${result.registered.join(", ") || "none"})`
    );
    console.log(
      `[WEBHOOK_REGISTRATION] Skipped: ${result.skipped.length} (${result.skipped.join(", ") || "none"})`
    );
    console.log(
      `[WEBHOOK_REGISTRATION] Errors: ${result.errors.length} (${result.errors.join("; ") || "none"})`
    );
    console.log(
      `[WEBHOOK_REGISTRATION] Overall: ${result.success ? "✅ SUCCESS" : "⚠️ PARTIAL/FAILED"}`
    );
    console.log(`[WEBHOOK_REGISTRATION] ================================`);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[WEBHOOK_REGISTRATION] Fatal error during registration: ${errorMessage}`
    );
    result.errors.push(`Fatal error: ${errorMessage}`);
    result.success = false;
    return result;
  }
}

/**
 * Delete all webhooks for a shop (useful for cleanup during disconnect)
 *
 * @param shopDomain - Shop domain
 * @param accessToken - Shop access token
 * @returns Number of webhooks deleted
 */
export async function deleteAllWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<number> {
  try {
    console.log(
      `[WEBHOOK_DELETION] Fetching webhooks to delete for ${shopDomain}`
    );

    const existingWebhooks = await fetchExistingWebhooks(shopDomain, accessToken);

    if (existingWebhooks.length === 0) {
      console.log(`[WEBHOOK_DELETION] No webhooks to delete`);
      return 0;
    }

    let deletedCount = 0;

    for (const webhook of existingWebhooks) {
      try {
        const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks/${webhook.id}.json`;

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        });

        if (response.ok) {
          console.log(
            `[WEBHOOK_DELETION] ✅ Deleted webhook: ${webhook.topic} (ID: ${webhook.id})`
          );
          deletedCount++;
        } else {
          const errorText = await response.text();
          console.error(
            `[WEBHOOK_DELETION] ❌ Failed to delete webhook ${webhook.id}: ${response.status} ${errorText}`
          );
        }
      } catch (error) {
        console.error(
          `[WEBHOOK_DELETION] Error deleting webhook ${webhook.id}:`,
          error
        );
      }
    }

    console.log(
      `[WEBHOOK_DELETION] Deleted ${deletedCount}/${existingWebhooks.length} webhooks`
    );
    return deletedCount;
  } catch (error) {
    console.error(`[WEBHOOK_DELETION] Failed to delete webhooks:`, error);
    return 0;
  }
}
