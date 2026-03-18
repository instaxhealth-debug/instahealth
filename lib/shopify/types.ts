/**
 * Shopify Types and Interfaces
 *
 * Type definitions for Shopify API interactions
 */

export interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string | null;
  handle: string;
  product_type: string;
  tags: string;
  status: "active" | "archived" | "draft";
  images: Array<{
    id: number;
    src: string;
    position: number;
  }>;
  variants: ShopifyVariant[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyVariant {
  id: string;
  product_id: string;
  title: string;
  price: string;
  sku: string | null;
  inventory_quantity: number;
  inventory_policy: "deny" | "continue";
  compare_at_price: string | null;
}

export interface ShopifyWebhookPayload {
  id: string | number;
  [key: string]: any;
}

export interface ShopifyOAuthTokenResponse {
  access_token: string;
  scope: string;
}

export interface ShopifyConnection {
  shopDomain: string;
  accessToken: string;
  scopes: string;
  installedAt: Date;
}

export interface ShopifySyncResult {
  success: boolean;
  productsProcessed: number;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  errors: string[];
}

export interface ShopifyProductMapping {
  shopifyProduct: ShopifyProduct;
  variant: ShopifyVariant;
  instahealthCategory: string;
  priceFils: number;
  imageUrl: string | null;
}

export const SHOPIFY_SCOPES = [
  "read_products",
  "read_inventory",
  "read_orders",
] as const;

export const SHOPIFY_API_VERSION = "2024-01";
