# Search Fix - Quick Start Guide

## 🚀 Deploy the Fix (3 Steps)

### Step 1: Verify Build Passes
```bash
npm run build
```
**Expected:** ✅ Build successful

### Step 2: Run Clean Reindex
```bash
npx tsx scripts/reindex-clean.ts
```
**Expected:** Index cleared and rebuilt with active+published products only

### Step 3: Test Search
1. Go to marketplace homepage
2. Search for "instapepz" → Should show real InstaPepz products
3. Search for "hex" → Should show Hexarelin products
4. Search for "reta" → Should show Retatrutide products

**Verify:**
- ✅ All results are real products
- ✅ Vendor names display correctly
- ✅ No junk/debug text
- ❌ No unpublished products
- ❌ No inactive products

---

## 📋 What Was Fixed

**Root Cause:**
- Algolia indexer was indexing ALL products (active, inactive, published, unpublished)
- No filters for `active: true` and `published: true`

**Solution:**
- Updated `server/services/algolia.ts` with strict filters
- Created clean reindex script
- Now only active + published products from active vendors are searchable

**Files Changed:**
1. `server/services/algolia.ts` - Added `active: true, published: true` filters
2. `scripts/reindex-clean.ts` - New clean reindex script (NEW)
3. `docs/SEARCH_FIX_REPORT.md` - Full technical report (NEW)

---

## 🔍 Search Architecture

### Current Flow (CORRECT)
```
User types in search bar
  ↓
HeaderSearch component (components/layout/HeaderSearch.tsx)
  ↓
useSearch hook (app/(marketplace)/search/useSearch.ts)
  ↓
/api/search endpoint (app/api/search/route.ts)
  ↓
Algolia index (filtered: active:true AND published:true)
  ↓
Results displayed (vendor name, product name, description)
```

### Filter Rules
**Indexed products must have:**
- ✅ `active = true`
- ✅ `published = true`
- ✅ `vendor.status = "active"`

**Excluded products:**
- ❌ `active = false` (inactive)
- ❌ `published = false` (unpublished/draft)
- ❌ Inactive vendors
- ❌ Archived products

---

## 🛠️ Maintenance Commands

### Clean Reindex (removes all, rebuilds from DB)
```bash
npx tsx scripts/reindex-clean.ts
```

### Cron Reindex (via API endpoint)
```bash
curl -X POST https://your-domain.com/api/cron/reindex-algolia \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Check Algolia Settings
```bash
npx tsx scripts/algolia-config.ts
```

---

## 📊 Expected Results After Reindex

### Search: "instapepz"
```
✅ InstaPepz Hexarelin - InstaPepz
✅ InstaPepz BPC-157 - InstaPepz
✅ InstaPepz Retatrutide - InstaPepz
```

### Search: "hex"
```
✅ Hexarelin 5mg - InstaPepz
```

### Search: "reta"
```
✅ Retatrutide 10mg - InstaPepz
```

**Should NOT see:**
- ❌ Unpublished products
- ❌ Mock/demo products
- ❌ Debug text
- ❌ Junk strings

---

## ⚠️ Important Notes

1. **Reindex is REQUIRED** - The fix won't apply until you run `npx tsx scripts/reindex-clean.ts`
2. **Build passed** - No code errors, safe to deploy
3. **No breaking changes** - All existing search functionality preserved
4. **Automatic cleanup** - Products automatically removed from index when unpublished

---

## 🎯 Success Criteria

After running reindex, verify:
- [ ] Search bar shows only published products
- [ ] Vendor names are real (InstaPepz, etc.)
- [ ] No junk/debug text in results
- [ ] Unpublished products don't appear
- [ ] Results link to correct product pages
- [ ] Search is fast (<500ms)

---

## 📖 Full Documentation

See `docs/SEARCH_FIX_REPORT.md` for complete technical details.
