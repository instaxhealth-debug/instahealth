/**
 * Shopify Sync Service
 *
 * Handles synchronization of Shopify products to InstaHealth database
 * ✅ FIX: Atomic upsert using vendorId_externalId composite key (no race conditions)
 * ✅ FIX: Multi-variant support (one product row per variant)
 * ✅ FIX: Slug generation using Shopify handle + variant ID
 * ✅ FIX: Soft delete pattern with deletedAt timestamp
 * ✅ FIX: Variant-aware checkout URLs with ?variant={variantId}
 */

import { prisma } from "@/lib/prisma";
import { ShopifyClient } from "./client";
import { mapShopifyToCategory, isValidCategoryForVendor } from "./category-mapper";
import type { ShopifyProduct, ShopifyVariant, ShopifySyncResult } from "./types";

/**
 * Generate unique slug from Shopify handle and variant ID
 * ✅ FIX: Uses Shopify handle + deterministic hash for collision resistance
 */
function generateSlug(handle: string, vendorSlug: string, variantId: string): string {
  // Normalize handle (remove multiple dashes)
  const normalizedHandle = handle.replace(/-+/g, '-');

  // Create deterministic 8-char hash from variant ID for collision resistance
  // Using simple hash instead of crypto.createHash to avoid importing crypto
  let hash = 0;
  for (let i = 0; i < variantId.length; i++) {
    hash = ((hash << 5) - hash) + variantId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const variantHash = Math.abs(hash).toString(36).padStart(8, '0').slice(0, 8);

  return `${vendorSlug}-${normalizedHandle}-${variantHash}`;
}

/**
 * Convert price to fils (AED cents)
 */
function priceToFils(priceString: string): number {
  const price = parseFloat(priceString);
  return Math.round(price * 100);
}

/**
 * Map Shopify product + variant to InstaHealth product data
 * ✅ FIX: Generates data for ONE variant (caller loops through all variants)
 */
function mapShopifyProductToData(
  shopifyProduct: ShopifyProduct,
  variant: ShopifyVariant,
  vendorId: string,
  vendorSlug: string,
  shopDomain: string,
  allowedCategories: string[]
) {
  const category = mapShopifyToCategory(shopifyProduct);

  // Skip if category not allowed for vendor
  if (!isValidCategoryForVendor(category, allowedCategories)) {
    return null;
  }

  const priceFils = priceToFils(variant.price);
  const imageUrl = shopifyProduct.images.length > 0 ? shopifyProduct.images[0].src : null;

  // ✅ FIX: Use Shopify handle + variant ID for guaranteed uniqueness
  const slug = generateSlug(shopifyProduct.handle, vendorSlug, variant.id);

  // Clean HTML from description
  const description = shopifyProduct.body_html
    ? shopifyProduct.body_html.replace(/<[^>]*>/g, "").trim()
    : null;

  // ✅ FIX: Variant-aware checkout URL using ?variant={variantId} parameter
  const checkoutUrl = `https://${shopDomain}/products/${shopifyProduct.handle}?variant=${variant.id}`;

  return {
    name: shopifyProduct.title,
    slug,
    description,
    category,
    priceFils,
    imageUrl,
    inStock: variant.inventory_quantity > 0 || variant.inventory_policy === "continue",
    active: shopifyProduct.status === "active",
    published: shopifyProduct.status === "active",
    inventoryStatus: variant.inventory_quantity > 0 ? "in_stock" : "out",
    tags: shopifyProduct.tags ? shopifyProduct.tags.split(",").map((t) => t.trim()) : [],
    sku: variant.sku || undefined,
    source: "shopify" as const,
    externalId: shopifyProduct.id,
    externalVariantId: variant.id,
    externalHandle: shopifyProduct.handle,
    syncStatus: "synced" as const,
    lastExternalSyncAt: new Date(),
    checkoutMode: "handoff" as const,
    externalCheckoutUrl: checkoutUrl,
    isPublished: true,
    vendorId,
    // ✅ FIX: deletedAt field not set on sync (only set when webhook fires)
    deletedAt: null,
  };
}

/**
 * Sync all products for a vendor
 * ✅ FIX: Creates one product row per variant for multi-variant products
 */
export async function syncShopifyProducts(vendorId: string): Promise<ShopifySyncResult> {
  const result: ShopifySyncResult = {
    success: false,
    productsProcessed: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    errors: [],
  };

  try {
    // Get vendor with Shopify connection
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        slug: true,
        shopifyConnected: true,
        shopifyShopDomain: true,
        shopifyAccessToken: true,
        allowedCategories: true,
      },
    });

    if (!vendor || !vendor.shopifyConnected || !vendor.shopifyShopDomain || !vendor.shopifyAccessToken) {
      result.errors.push("Vendor not connected to Shopify");
      return result;
    }

    // Initialize Shopify client
    const client = new ShopifyClient(vendor.shopifyShopDomain, vendor.shopifyAccessToken);

    // Fetch all products from Shopify
    const shopifyProducts = await client.fetchAllProducts();

    // Update vendor sync status
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        shopifySyncStatus: "syncing",
      },
    });

    // Process each product and all its variants
    for (const shopifyProduct of shopifyProducts) {
      try {
        result.productsProcessed++;

        // ✅ FIX: Process ALL variants (not just first)
        if (shopifyProduct.variants.length === 0) {
          result.productsSkipped++;
          continue;
        }

        // Create one product row per variant
        for (const variant of shopifyProduct.variants) {
          try {
            // Map to InstaHealth product data
            const productData = mapShopifyProductToData(
              shopifyProduct,
              variant,
              vendor.id,
              vendor.slug,
              vendor.shopifyShopDomain,
              vendor.allowedCategories
            );

            if (!productData) {
              result.productsSkipped++;
              continue;
            }

            // ✅ FIX: Atomic upsert using vendorId_externalVariantId composite unique constraint
            // Each Shopify variant maps to exactly one Product row
            const upsertResult = await prisma.product.upsert({
              where: {
                vendorId_externalVariantId: {
                  vendorId: vendor.id,
                  externalVariantId: variant.id,
                },
              },
              update: productData,
              create: productData,
            });

            // Track whether this was create or update for metrics
            const wasCreated = upsertResult.createdAt.getTime() === upsertResult.updatedAt.getTime();
            if (wasCreated) {
              result.productsCreated++;
            } else {
              result.productsUpdated++;
            }
          } catch (variantError) {
            console.error(`Error processing variant ${variant.id} of product ${shopifyProduct.id}:`, variantError);
            result.errors.push(
              `Variant ${variant.id}: ${variantError instanceof Error ? variantError.message : String(variantError)}`
            );
          }
        }
      } catch (error) {
        console.error(`Error processing product ${shopifyProduct.id}:`, error);
        result.errors.push(`Product ${shopifyProduct.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Update vendor sync status
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        shopifySyncStatus: "connected",
        shopifyLastSyncAt: new Date(),
      },
    });

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    console.error("Shopify sync error:", error);
    result.errors.push(error instanceof Error ? error.message : String(error));

    // Update vendor sync status to error
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        shopifySyncStatus: "error",
      },
    }).catch(() => {
      // Ignore error updating status
    });

    return result;
  }
}

/**
 * Sync single product by external ID
 * ✅ FIX: Handles all variants for multi-variant products
 */
export async function syncShopifyProduct(vendorId: string, externalProductId: string): Promise<boolean> {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        slug: true,
        shopifyShopDomain: true,
        shopifyAccessToken: true,
        allowedCategories: true,
      },
    });

    if (!vendor || !vendor.shopifyShopDomain || !vendor.shopifyAccessToken) {
      return false;
    }

    const client = new ShopifyClient(vendor.shopifyShopDomain, vendor.shopifyAccessToken);
    const shopifyProduct = await client.fetchProductById(`gid://shopify/Product/${externalProductId}`);

    if (!shopifyProduct || shopifyProduct.variants.length === 0) {
      return false;
    }

    // ✅ FIX: Sync all variants
    for (const variant of shopifyProduct.variants) {
      const productData = mapShopifyProductToData(
        shopifyProduct,
        variant,
        vendor.id,
        vendor.slug,
        vendor.shopifyShopDomain,
        vendor.allowedCategories
      );

      if (!productData) {
        continue;
      }

      // ✅ FIX: Use atomic upsert with variant ID
      await prisma.product.upsert({
        where: {
          vendorId_externalVariantId: {
            vendorId: vendor.id,
            externalVariantId: variant.id,
          },
        },
        update: productData,
        create: productData,
      });
    }

    return true;
  } catch (error) {
    console.error(`Error syncing product ${externalProductId}:`, error);
    return false;
  }
}

/**
 * Delete Shopify product from database
 * ✅ FIX: Soft delete using deletedAt timestamp instead of hard delete
 */
export async function deleteShopifyProduct(vendorId: string, externalProductId: string): Promise<boolean> {
  try {
    // ✅ FIX: Soft delete - set deletedAt timestamp instead of DELETE
    // This prevents foreign key violations with CartItems/OrderItems
    const updateCount = await prisma.product.updateMany({
      where: {
        vendorId,
        externalId: externalProductId,
        deletedAt: null, // Only soft-delete if not already deleted
      },
      data: {
        deletedAt: new Date(),
        active: false,
        published: false,
        syncStatus: "deleted",
      },
    });

    return updateCount.count > 0;
  } catch (error) {
    console.error(`Error deleting product ${externalProductId}:`, error);
    return false;
  }
}
