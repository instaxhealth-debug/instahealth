# Reindex Script Fix - Complete Report

## Problem Summary

**Issue:** Running `npx tsx scripts/reindex-clean.ts` failed with:
```
Error: Cannot find module 'server-only'
```

**Root Cause:**
The reindex script (`scripts/reindex-clean.ts`) imported `server/services/algolia.ts`, which has `import "server-only"` at the top. The "server-only" package is a Next.js runtime guard that prevents server code from being bundled for the client. However, it also prevents standalone scripts (running via `tsx`) from importing that code, since `tsx` is not a Next.js server environment.

**Dependency Chain:**
```
scripts/reindex-clean.ts
  → imports server/services/algolia.ts
    → imports "server-only" (Next.js-only package)
      → Error: Cannot find module 'server-only'
```

---

## Solution Implemented

### Architecture Refactoring

**Before:**
- All Algolia logic in `server/services/algolia.ts` with "server-only" guard
- Scripts couldn't import this file

**After:**
- **Core logic** in `lib/algolia/indexer.ts` (plain utility, no Next.js dependencies)
- **Next.js wrapper** in `server/services/algolia.ts` (re-exports with "server-only" guard)
- Scripts import from `lib/algolia/indexer.ts` directly

### File Structure

```
lib/algolia/indexer.ts          # Plain utility (NO "server-only")
  ↑
  ├─ server/services/algolia.ts # Next.js wrapper (WITH "server-only")
  └─ scripts/reindex-clean.ts   # Standalone script
```

---

## Files Changed

### 1. Created: `lib/algolia/indexer.ts` (NEW)

**Purpose:** Core Algolia indexing logic without Next.js dependencies

**Key Components:**
- `ProductSearchObject` type (exported)
- `AlgoliaIndexer` class with methods:
  - `upsertProduct(productId)` - Index or remove single product
  - `removeProduct(productId)` - Delete from index
  - `reindexAll()` - Full reindex with filters
  - `reindexByIds(productIds)` - Batch reindex
  - `clearIndex()` - Clear all objects
  - `getSettings()` - Get index configuration

**Filters Applied:**
```typescript
where: {
  active: true,        // ✅ Only active products
  published: true,     // ✅ Only published products
  vendor: {
    status: "active",  // ✅ Only active vendors
  },
}
```

**Dependencies:**
- `algoliasearch` - Algolia SDK
- `@prisma/client` - Prisma types
- NO "server-only" import

**Lines of Code:** 312

### 2. Refactored: `server/services/algolia.ts`

**Before:**
```typescript
import "server-only";
// 283 lines of Algolia logic here
```

**After:**
```typescript
import "server-only";
import { AlgoliaIndexer } from "@/lib/algolia/indexer";
import { prisma } from "@/lib/prisma";

const indexer = new AlgoliaIndexer(config, prisma);

export async function reindexAllProducts() {
  return indexer.reindexAll();
}
// ... re-export other methods
```

**Purpose:** Thin Next.js wrapper that:
- Keeps "server-only" guard for Next.js server code
- Re-exports core indexer methods
- Provides same API as before (no breaking changes)

**Lines of Code:** 45 (reduced from 283)

### 3. Updated: `scripts/reindex-clean.ts`

**Before:**
```typescript
import { reindexAllProducts } from "../server/services/algolia";
// ❌ Fails: Can't import "server-only"
```

**After:**
```typescript
import { AlgoliaIndexer } from "../lib/algolia/indexer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const indexer = new AlgoliaIndexer(config, prisma);

await indexer.clearIndex();
const result = await indexer.reindexAll();
// ✅ Works: No "server-only" dependency
```

**Key Changes:**
- Import from `lib/algolia/indexer.ts` instead of `server/services/algolia.ts`
- Instantiate own Prisma client
- Create indexer instance directly
- Added TypeScript non-null assertions for env vars after validation

**Lines Changed:** 3 imports, 1 instantiation, TypeScript fixes

---

## Command Output

### Reindex Script Execution

```bash
$ npx tsx scripts/reindex-clean.ts
```

**Output:**
```
🧹 Clean Algolia Reindex Starting...

Step 1/3: Clearing Algolia index...
✅ Index cleared

Step 2/3: Reindexing products (active + published only)...
✅ Indexed 89 products in 5934ms

Step 3/3: Verifying index settings...
✅ Index settings:
   - Searchable attributes: name, vendorName, category, tags, unordered(description)
   - Filterable attributes: 9
   - Custom ranking: desc(vendorVerifiedScore), desc(inventoryScore), desc(marginPct), desc(vendorRatingWeighted), desc(updatedAt)

🎉 Clean reindex complete!

📊 Summary:
   - Total products indexed: 89
   - Duration: 5.93s
   - Index: products_prod

✅ Search results will now show ONLY active, published products from active vendors.
```

**Status:** ✅ SUCCESS

### Build Verification

```bash
$ npm run build
```

**Output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types ...
✓ Generating static pages (100/100)
✓ Finalizing page optimization ...
```

**Status:** ✅ PASSED

---

## Filter Rules Enforced

### Products Indexed (All Must Be True)
- ✅ `active = true` - Product is active
- ✅ `published = true` - Product is published to storefront
- ✅ `vendor.status = "active"` - Vendor is active

### Products Excluded
- ❌ `active = false` - Inactive products
- ❌ `published = false` - Unpublished/draft products
- ❌ `vendor.status != "active"` - Inactive vendors
- ❌ Archived products
- ❌ Test/mock data

**Total Indexed:** 89 active, published products from active vendors

---

## Technical Details

### Why "server-only" Exists

The "server-only" package is a Next.js convention that:
1. Prevents server code from being bundled for the client (security)
2. Fails at build time if server code is imported from client components
3. Only works within Next.js build environment

### Why Scripts Can't Import "server-only"

When running `tsx` or `ts-node` outside Next.js:
- No Next.js bundler/compiler
- "server-only" module not resolvable
- Error: `Cannot find module 'server-only'`

### Solution Pattern

**Separation of Concerns:**
1. **Core Logic** (`lib/algolia/indexer.ts`)
   - Pure TypeScript/JavaScript
   - No Next.js dependencies
   - Usable by scripts, tests, tools

2. **Next.js Wrapper** (`server/services/algolia.ts`)
   - Imports "server-only"
   - Re-exports core logic
   - Used by Next.js server code

3. **Scripts** (`scripts/reindex-clean.ts`)
   - Import core logic directly
   - Bypass Next.js wrapper
   - Run standalone

---

## Benefits

### 1. Scripts Work
- ✅ `npx tsx scripts/reindex-clean.ts` runs successfully
- ✅ No "server-only" errors
- ✅ Can run outside Next.js environment

### 2. Next.js Security Preserved
- ✅ `server/services/algolia.ts` still has "server-only" guard
- ✅ Client components can't import server code
- ✅ No security regressions

### 3. Code Reusability
- ✅ Core logic can be used by:
  - Next.js server code
  - Standalone scripts
  - Tests
  - CLI tools
  - Background workers

### 4. No Breaking Changes
- ✅ Existing Next.js server code unchanged
- ✅ Same API for `reindexAllProducts()`, etc.
- ✅ All existing imports work
- ✅ Build passes

---

## Verification Checklist

- [x] Reindex script runs successfully
- [x] No "server-only" errors
- [x] Build passes with no TypeScript errors
- [x] 89 products indexed (active + published only)
- [x] Algolia index cleared and rebuilt
- [x] Index settings verified
- [x] Duration: ~6 seconds
- [x] Active/published filters intact
- [x] Next.js server code still protected

---

## Usage

### Run Reindex Script
```bash
npx tsx scripts/reindex-clean.ts
```

### Use in Next.js Server Code
```typescript
import { reindexAllProducts } from "@/server/services/algolia";
await reindexAllProducts();
```

### Use in Standalone Scripts
```typescript
import { AlgoliaIndexer } from "@/lib/algolia/indexer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const indexer = new AlgoliaIndexer(config, prisma);
await indexer.reindexAll();
```

---

## Summary

| Item | Status |
|------|--------|
| Root cause | ✅ "server-only" import blocking scripts |
| Solution | ✅ Refactored to plain utility + Next.js wrapper |
| Script runs | ✅ Successfully indexed 89 products in 5.93s |
| Build passes | ✅ No TypeScript errors |
| Filters intact | ✅ active=true, published=true, vendor.status=active |
| Breaking changes | ❌ None - API preserved |
| Files created | 1 (`lib/algolia/indexer.ts`) |
| Files modified | 2 (`server/services/algolia.ts`, `scripts/reindex-clean.ts`) |

**Result:** Reindex script is now fully functional and can run outside Next.js environment while maintaining all security guards and filter rules.
