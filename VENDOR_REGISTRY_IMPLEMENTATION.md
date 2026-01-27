# Vendor Registry Implementation

## Summary

Implemented a scalable Instashop-style marketplace architecture with a vendor registry system. Shopify is now ONLY the product source + checkout, while the app controls vendor grouping and vertical routing.

## ✅ Files Created

### 1. `/data/vendors.ts`
- **Single source of truth** for vendor → vertical mapping
- `VendorConfig` type with required `vertical` field
- `VENDORS` array - add vendors here to make them appear in marketplace
- No hardcoded vendors in pages

### 2. `/lib/vendorProducts.ts`
- `getActiveVendorsByVertical(vertical)` - Get vendors for a vertical
- `getVendorById(id)` - Look up vendor by ID
- `getVendorCatalogPreview(vendor, limit)` - Get first N products for preview
- `getVendorFullCatalog(vendor)` - Get all products for vendor page

## ✅ Files Modified

### 1. `/app/marketplace/peptides/page.tsx`
- **Registry-driven**: Uses `getActiveVendorsByVertical("peptides")`
- Fetches products via `getVendorCatalogPreview()` for each vendor
- Shows first 3 products per vendor
- "View all from vendor" CTA if more than 3 products
- **No hardcoded vendors**

### 2. `/app/marketplace/iv-drips/page.tsx` (NEW)
- Same pattern as peptides page
- Uses `getActiveVendorsByVertical("iv")`
- Registry-driven, no hardcoded vendors

### 3. `/app/marketplace/blood-tests/page.tsx` (NEW)
- Same pattern as peptides page
- Uses `getActiveVendorsByVertical("bloods")`
- Registry-driven, no hardcoded vendors

### 4. `/app/vendor/[id]/page.tsx` (UPDATED)
- Looks up vendor by ID from `VENDORS` registry
- Returns `notFound()` if vendor not found or inactive
- Fetches all products using `vendor.shopifyVendorName`
- Renders full product grid
- **No hardcoded vendor data**

### 5. `/lib/shopifyProducts.ts` (UPDATED)
- `shopifyProductToOffering()` now accepts optional `vendorId` parameter

## 🎯 Architecture Benefits

### Scalability
- **Unlimited vendors**: Add to `VENDORS` array, no code changes needed
- **Unlimited products**: Products automatically appear when added to Shopify
- **Clean separation**: App controls routing, Shopify provides products

### Vertical Routing
- **Registry-controlled**: Vertical comes from `vendor.vertical` field
- **No Shopify tags**: Vertical logic is in app, not Shopify
- **Single source of truth**: `data/vendors.ts` controls everything

### Adding New Vendors
To add a new vendor:
1. Add entry to `VENDORS` array in `/data/vendors.ts`
2. Set `shopifyVendorName` to match Shopify product vendor field
3. Set `vertical` to "peptides", "iv", or "bloods"
4. Products automatically appear when imported to Shopify with matching vendor name

**No code changes needed in pages!**

## 📋 How It Works

### Marketplace Page Flow
1. Page calls `getActiveVendorsByVertical("peptides")`
2. Gets all active vendors for that vertical from registry
3. For each vendor, calls `getVendorCatalogPreview(vendor, 3)`
4. Renders vendor card + first 3 products
5. Shows "View all" CTA if vendor has more than 3 products

### Vendor Page Flow
1. Extracts vendor ID from URL (`/vendor/[id]`)
2. Looks up vendor in registry using `getVendorById(id)`
3. If not found or inactive → `notFound()`
4. Fetches all products using `getVendorFullCatalog(vendor)`
5. Renders full product grid

## ✅ Constraints Met

- ✅ **Shopify Vendor field MUST match shopifyVendorName** - Enforced in registry
- ✅ **Vertical routing from registry only** - No Shopify tags used
- ✅ **Adding vendor = data only** - Just add to `VENDORS` array
- ✅ **No product tags required** - Vertical comes from registry
- ✅ **Unlimited vendors per vertical** - Registry supports any number

## 🚀 Result

The marketplace now has:
- **Registry-driven architecture** - Single source of truth
- **Zero hardcoded vendors** - All come from registry
- **Zero Shopify tag dependency** - Vertical logic in app
- **True Instashop-style** - Vendor grouping controlled by app
- **Unlimited scalability** - Add vendors without code changes

## 📝 Example: Adding a New Vendor

```typescript
// In /data/vendors.ts
{
  id: "peptide-labs",
  name: "Peptide Labs",
  vertical: "peptides",
  shopifyVendorName: "Peptide Labs", // Must match Shopify vendor field
  isActive: true,
  serviceAreas: ["Dubai"],
  availabilityText: "Delivery today",
}
```

That's it! The vendor will automatically appear in `/marketplace/peptides` with all their products from Shopify.
