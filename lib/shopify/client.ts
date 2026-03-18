/**
 * Shopify API Client
 *
 * GraphQL and REST API wrapper for Shopify Admin API
 */

import crypto from "crypto";
import type { ShopifyProduct, ShopifyOAuthTokenResponse } from "./types";
import { SHOPIFY_API_VERSION } from "./types";

export class ShopifyClient {
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.accessToken = accessToken;
    this.apiVersion = SHOPIFY_API_VERSION;
  }

  /**
   * Get base API URL
   */
  private getApiUrl(path: string): string {
    return `https://${this.shopDomain}/admin/api/${this.apiVersion}${path}`;
  }

  /**
   * Make GraphQL request with rate limit retry
   */
  private async graphql<T = any>(
    query: string,
    variables?: Record<string, any>,
    retries = 3
  ): Promise<T> {
    const response = await fetch(this.getApiUrl("/graphql.json"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2;

      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return this.graphql<T>(query, variables, retries - 1);
      } else {
        throw new Error(`Shopify rate limit exceeded after ${retries} retries`);
      }
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify GraphQL error: ${response.status} ${error}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Shopify GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  /**
   * Make REST request with rate limit retry
   */
  private async rest<T = any>(
    path: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const response = await fetch(this.getApiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
        ...options.headers,
      },
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2;

      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return this.rest<T>(path, options, retries - 1);
      } else {
        throw new Error(`Shopify rate limit exceeded after ${retries} retries`);
      }
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify REST error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Fetch all products using GraphQL (paginated)
   */
  async fetchAllProducts(): Promise<ShopifyProduct[]> {
    const products: ShopifyProduct[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    const query = `
      query getProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              descriptionHtml
              handle
              productType
              tags
              status
              createdAt
              updatedAt
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                  }
                }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                    inventoryPolicy
                    compareAtPrice
                  }
                }
              }
            }
          }
        }
      }
    `;

    while (hasNextPage) {
      type ProductsResponse = {
        products: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          edges: Array<{ node: any }>;
        };
      };
      const data: ProductsResponse = await this.graphql<ProductsResponse>(query, { cursor });

      const edges = data.products.edges;
      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;

      for (const edge of edges) {
        const node = edge.node;
        products.push(this.transformGraphQLProduct(node));
      }
    }

    return products;
  }

  /**
   * Fetch single product by ID
   */
  async fetchProductById(productId: string): Promise<ShopifyProduct | null> {
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          descriptionHtml
          handle
          productType
          tags
          status
          createdAt
          updatedAt
          images(first: 10) {
            edges {
              node {
                id
                url
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
                inventoryPolicy
                compareAtPrice
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.graphql<{ product: any }>(query, { id: productId });
      if (!data.product) return null;
      return this.transformGraphQLProduct(data.product);
    } catch (error) {
      console.error(`Failed to fetch product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Transform GraphQL product response to our Product interface
   */
  private transformGraphQLProduct(node: any): ShopifyProduct {
    return {
      id: node.id.replace("gid://shopify/Product/", ""),
      title: node.title,
      body_html: node.descriptionHtml,
      handle: node.handle,
      product_type: node.productType || "",
      tags: node.tags.join(", "),
      status: node.status.toLowerCase() as "active" | "archived" | "draft",
      images: node.images.edges.map((e: any, index: number) => ({
        id: parseInt(e.node.id.replace(/\D/g, "")),
        src: e.node.url,
        position: index + 1,
      })),
      variants: node.variants.edges.map((e: any) => ({
        id: e.node.id.replace("gid://shopify/ProductVariant/", ""),
        product_id: node.id.replace("gid://shopify/Product/", ""),
        title: e.node.title,
        price: e.node.price,
        sku: e.node.sku,
        inventory_quantity: e.node.inventoryQuantity || 0,
        inventory_policy: e.node.inventoryPolicy.toLowerCase() as "deny" | "continue",
        compare_at_price: e.node.compareAtPrice,
      })),
      created_at: node.createdAt,
      updated_at: node.updatedAt,
    };
  }

  /**
   * Create webhook subscription
   */
  async createWebhook(topic: string, address: string): Promise<void> {
    const mutation = `
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await this.graphql(mutation, {
      topic: topic.toUpperCase().replace(/\//g, "_"),
      webhookSubscription: {
        callbackUrl: address,
        format: "JSON",
      },
    });
  }

  /**
   * Get shop information
   */
  async getShop(): Promise<{ name: string; domain: string; email: string }> {
    const query = `
      query {
        shop {
          name
          primaryDomain {
            url
          }
          email
        }
      }
    `;

    const data = await this.graphql<{ shop: any }>(query);
    return {
      name: data.shop.name,
      domain: data.shop.primaryDomain.url,
      email: data.shop.email,
    };
  }
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string,
  clientId: string,
  clientSecret: string
): Promise<ShopifyOAuthTokenResponse> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify OAuth error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Verify webhook signature using constant-time comparison
 */
export function verifyWebhookSignature(
  body: string,
  hmacHeader: string,
  secret: string
): boolean {
  try {
    if (!body || !hmacHeader || !secret) {
      return false;
    }

    const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");

    const hashBuffer = Buffer.from(hash);
    const hmacBuffer = Buffer.from(hmacHeader);

    if (hashBuffer.length !== hmacBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hashBuffer, hmacBuffer);
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}
