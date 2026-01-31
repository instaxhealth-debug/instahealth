# Algolia Search Hardening: Implementation Checklist

## Files Modified/Created

### ✅ Prisma Schema
- **File**: `prisma/schema.prisma`
- **Changes**:
  - Added `Vendor.verified: Boolean @default(false)`
  - Added `Product.inventoryStatus: String @default("in_stock")`
  - Added `Product.published: Boolean @default(true)`
  - Added `Product.tags: String[] @default([])`

### ✅ Prisma Migration
- **File**: `prisma/migrations/20260131_add_search_fields/migration.sql`
- **Creates**: Schema migration with indexes

### ✅ Algolia Service (Complete Rewrite)
- **File**: `server/services/algolia.ts`
- **Key Changes**:
  1. Batch indexing with `saveObjects()` (300 per batch)
  2. Single location query per operation (not per product)
  3. `buildProductSearchObject()` now accepts pre-fetched locations
  4. `reindexAllProducts()` returns `{ count, duration }`
  5. Pagination: 100 products at a time
  6. Uses `vendor.verified` (not `complianceAccepted`)
  7. Uses `product.published` (not `= active`)
  8. Uses `product.inventoryStatus` directly
  9. Populates `tags` from `product.tags`

### ✅ Cron Endpoint
- **File**: `app/api/cron/reindex-algolia/route.ts`
- **Changes**:
  - Added `GET` handler (same logic as POST)
  - Both enforce `x-cron-secret` header
  - Returns `{ ok, count, durationMs }`

### ✅ Search Hook Signature
- **File**: `app/(marketplace)/search/useSearch.ts`
- **Changes**:
  - New: `useSearch({ q, category?, vendorId?, locationId? })`
  - All params passed to `/api/search?q=...&category=...` etc.
  - Old signature removed (was `useSearch<T>(query: string)`)

### ✅ HeaderSearch Component
- **File**: `components/layout/HeaderSearch.tsx`
- **Changes**:
  - Updated to new hook: `useSearch({ q: query })`
  - Remove generic `<ProductSearchHit>` type parameter

### ✅ Package.json
- **File**: `package.json`
- **Removed**: `@shopify/storefront-api-client`

### ✅ Documentation
- **File**: `ALGOLIA_HARDENING.md` (NEW)
- **File**: `verify-algolia.sh` (NEW)

---

## Pre-Deployment Checklist

### Database & Schema
- [ ] Run `npm run db:push` (applies migration)
- [ ] Verify migration applied: Check `public.Product` table for new columns
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'Product' 
  AND column_name IN ('inventoryStatus', 'published', 'tags');
  ```

### Algolia Configuration
- [ ] Set `.env.local` vars:
  ```
  ALGOLIA_APP_ID=<your_app_id>
  ALGOLIA_ADMIN_KEY=<your_admin_key>
  ALGOLIA_SEARCH_KEY=<your_search_key>
  ALGOLIA_PRODUCTS_INDEX=products_prod
  CRON_SECRET=<random_secret>
  ```
- [ ] Run `npm run algolia:config` (applies index settings)
- [ ] Verify in Algolia Dashboard:
  - Searchable attributes: name, vendorName, category, tags, description
  - Facet attributes: category, vendorId, locationIds, etc.
  - Custom ranking: vendorVerifiedScore, inventoryScore, etc.

### Reindexing
- [ ] Test cron locally:
  ```bash
  curl -X GET http://localhost:3000/api/cron/reindex-algolia \
    -H "x-cron-secret: $CRON_SECRET"
  ```
- [ ] Verify response: `{ "ok": true, "count": N, "durationMs": M }`
- [ ] Check Algolia dashboard for indexed objects
- [ ] Pick one hit and verify fields exist:
  ```json
  {
    "vendorVerifiedScore": 0 | 1,
    "inventoryScore": 0 | 1 | 2,
    "inventoryStatus": "in_stock" | "low" | "out",
    "published": true | false,
    "tags": [],
    "locationIds": [],
    "citySlugs": []
  }
  ```

### Search API
- [ ] Test basic search:
  ```bash
  curl "http://localhost:3000/api/search?q=bpc"
  ```
- [ ] Test with category filter:
  ```bash
  curl "http://localhost:3000/api/search?q=bpc&category=peptides"
  ```
- [ ] Test with vendor filter:
  ```bash
  curl "http://localhost:3000/api/search?q=bpc&vendorId=<id>"
  ```
- [ ] Test with location filter:
  ```bash
  curl "http://localhost:3000/api/search?q=bpc&locationId=<id>"
  ```

### Frontend
- [ ] Rebuild: `npm run build`
- [ ] Start dev server: `npm run dev`
- [ ] Test HeaderSearch component:
  - Type in search box
  - Verify API calls to `/api/search?q=...`
  - Verify results appear with skeleton loading
  - Verify filters work (if you add category/vendor params)

### Data Population
- [ ] Review product records for `inventoryStatus`, `published`, `tags`:
  ```sql
  SELECT id, name, "inventoryStatus", published, tags FROM "Product" LIMIT 5;
  ```
- [ ] If empty, populate via:
  - Admin UI (if you add form fields)
  - Script (bulk update)
  - Or accept defaults (`inventoryStatus='in_stock'`, `published=true`, `tags=[]`)

- [ ] Review vendor records for `verified`:
  ```sql
  SELECT id, name, verified FROM "Vendor" LIMIT 5;
  ```
- [ ] Set `verified=true` for compliant vendors (manually or via script)

### Shopify Cleanup
- [ ] Verify no Shopify imports remain:
  ```bash
  grep -r "@shopify" app/ lib/ components/ --include="*.ts" --include="*.tsx" || echo "✅ No Shopify imports"
  ```
- [ ] Run `npm install` (applies package.json cleanup)

---

## Deployment to Vercel

### 1. Code & Config
- [ ] Commit and push all changes
- [ ] Env vars in Vercel Dashboard:
  - `ALGOLIA_APP_ID`
  - `ALGOLIA_ADMIN_KEY`
  - `ALGOLIA_SEARCH_KEY`
  - `ALGOLIA_PRODUCTS_INDEX`
  - `CRON_SECRET`

### 2. Database
- [ ] Vercel runs `npm run db:push` automatically (if configured)
- [ ] Or manually run post-deployment:
  ```bash
  vercel env pull
  npm run db:push
  ```

### 3. Cron Job (Vercel Cron)
- [ ] Add to `vercel.json`:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/reindex-algolia",
        "schedule": "0 2 * * *"
      }
    ]
  }
  ```
- [ ] Or use external cron service (e.g., EasyCron) to POST/GET endpoint with header

### 4. Verification
- [ ] Smoke test: Search works on production
- [ ] Monitor Algolia dashboard for new objects
- [ ] Check server logs for any errors in `reindexAllProducts()`

---

## Troubleshooting

### "Missing ALGOLIA_* env vars"
- **Cause**: Env not set
- **Fix**: Check `.env.local` (local) or Vercel Dashboard (production)

### "Settings applied but objects not indexed"
- **Cause**: Migration not applied yet
- **Fix**: Run `npm run db:push`, then `npm run algolia:config`, then cron

### "Search returns 0 hits despite indexed objects"
- **Cause**: Filter mismatch (e.g., `published:false`)
- **Fix**: Check product records have `published=true`

### "Batch indexing slower than expected"
- **Cause**: Batch size too large or database query slow
- **Fix**: Reduce batch size (currently 300) or add DB indexes

### "Hook signature error: useSearch expects object"
- **Cause**: Old code calling `useSearch(query)`
- **Fix**: Update to `useSearch({ q: query })`

---

## Rollback Plan (if needed)

### 1. Database
```bash
# Undo migration (DEV/TEST only; production irreversible)
npx prisma migrate resolve --rolled-back 20260131_add_search_fields
```

### 2. Algolia
- Reapply old settings script (or manual config)
- Reindex with old service code

### 3. Code
- Revert commits
- Redeploy to Vercel

---

## Performance Baseline

**Before Hardening**:
- 500+ Promise.all per batch
- Per-product location queries
- No observability

**After Hardening**:
- 300-object saveObjects calls
- Single location query per batch
- Returns `{ count, duration }` for monitoring
- **Expected**: 2-3x faster reindexing

---

## Next Steps

1. **Immediate**: Run migration and configure Algolia
2. **Short-term**: Populate `inventoryStatus`, `tags`, `verified` on existing records
3. **Medium-term**: Update admin UI to edit these fields
4. **Long-term**: Implement synonyms, custom ranking tweaks, A/B testing
