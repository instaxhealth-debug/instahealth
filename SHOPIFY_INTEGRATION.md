# Shopify Storefront API Integration

## Summary

Replaced all mock/placeholder marketplace data with real Shopify products fetched via Storefront GraphQL API. Products are now dynamically loaded from your Shopify store.

## ✅ Files Created

### 1. `/lib/shopify.ts`
- Reusable Shopify Storefront API client
- Uses `fetch()` to call GraphQL endpoint
- Reads credentials from environment variables:
  - `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
  - `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- Robust error handling with clear error messages

### 2. `/lib/shopifyQueries.ts`
- GraphQL queries for Shopify Storefront API
- `PRODUCTS_BY_QUERY`: Fetch products by query (tag, vendor, etc.)
- `PRODUCT_BY_HANDLE`: Fetch single product by handle

### 3. `/lib/shopifyProducts.ts`
- Helper functions for fetching and processing Shopify products
- `getProductsByTag(tag)`: Fetch products with specific tag
- `getProductsByVendor(vendorName)`: Fetch products by vendor
- `groupByVendor(products)`: Group products by vendor
- `slugifyVendor(vendorName)`: Convert vendor name to slug
- `vendorSlugToName(slug)`: Convert slug back to vendor name
- `shopifyProductToOffering(product)`: Transform Shopify product to Offering format

## ✅ Files Modified

### 1. `/app/marketplace/peptides/page.tsx` (NEW)
- Fetches products with tag:Peptides from Shopify
- Groups products by vendor
- Renders vendor cards with first 3 products each
- Shows "View all from this vendor" CTA if more than 3 products
- Uses real Shopify data (no mock data)

### 2. `/app/vendor/[vendor]/page.tsx` (UPDATED)
- Fetches products by vendor name from Shopify
- Converts vendor slug to vendor name
- Renders all products from that vendor
- Includes filter tabs (All / Oral / Injectable)
- Uses real Shopify data

### 3. `/app/product/[handle]/page.tsx` (NEW)
- Fetches single product by handle from Shopify
- Displays product detail page
- Uses real Shopify data

### 4. `/components/pepz/ProductDetail.tsx` (UPDATED)
- Now fetches product from Shopify Storefront API
- Removed mock data dependency
- Uses real product data

### 5. `/components/marketplace/OfferingCard.tsx` (UPDATED)
- Updated product route to `/product/[handle]` instead of `/pepz/products/[slug]`

## 🔧 How It Works

### Marketplace Page Flow
1. User visits `/marketplace/peptides`
2. Page calls `getProductsByTag("Peptides")`
3. Products are grouped by vendor using `groupByVendor()`
4. Each vendor section shows:
   - Vendor card at top
   - First 3 products underneath
   - "View all" CTA if more products exist

### Vendor Page Flow
1. User clicks vendor or "View all" CTA
2. Page extracts vendor slug from URL
3. Converts slug to vendor name using `vendorSlugToName()`
4. Calls `getProductsByVendor(vendorName)`
5. Renders all products in a grid

### Product Page Flow
1. User clicks on a product card
2. Page extracts handle from URL
3. Calls `getProductByHandle(handle)`
4. Displays full product details

## 📋 Environment Variables Required

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
```

## ✅ How to Verify

1. **Set Environment Variables**
   - Ensure `.env.local` has correct Shopify credentials
   - Restart dev server after adding/updating env vars

2. **Run Dev Server**
   ```bash
   npm run dev
   ```

3. **Visit Marketplace Page**
   - Go to `http://localhost:3000/marketplace/peptides`
   - You should see:
     - Real vendors from your Shopify store
     - Real products grouped under each vendor
     - First 3 products per vendor
     - "View all from [Vendor]" CTAs

4. **Visit Vendor Page**
   - Click on a vendor name or "View all" CTA
   - You should see:
     - All products from that vendor
     - Filter tabs (All / Oral / Injectable)
     - Product cards with images, titles, prices

5. **Visit Product Page**
   - Click on any product card
   - You should see:
     - Full product details
     - Product images
     - Price and stock status
     - Add to cart functionality

## 🎯 Key Features

- ✅ **No Mock Data**: All products come from Shopify
- ✅ **Scalable**: Adding products/vendors in Shopify automatically appears on site
- ✅ **Production-Ready**: Error handling, loading states, empty states
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Reusable**: Single Shopify client used everywhere

## 🔍 Shopify Store Requirements

For this integration to work, your Shopify products should have:

1. **Tag**: Products should be tagged with "Peptides" (or relevant tag)
2. **Vendor**: Products should have vendor field set (e.g., "InstaPepz")
3. **Images**: Products should have at least one image
4. **Variants**: Products should have at least one variant with price

## 🚀 Next Steps

- Products added in Shopify with tag "Peptides" will automatically appear
- New vendors added in Shopify will automatically appear
- No code changes needed when adding products/vendors
