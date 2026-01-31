# ⚡ Algolia Hardening: Quick Start (5 min setup)

## Status: ✅ All Code Changes Complete
Database migration applied. Ready for configuration.

---

## 1️⃣ Set Environment Variables (1 min)

### Edit `.env.local`:
```bash
# Add these (replace with your actual values)
ALGOLIA_APP_ID=<your_algolia_app_id>
ALGOLIA_ADMIN_KEY=<your_algolia_admin_key>
ALGOLIA_PRODUCTS_INDEX=products_prod
CRON_SECRET=<generate_random_secret>
```

### For Production (Vercel Dashboard):
1. Go to **Settings → Environment Variables**
2. Add the same 4 variables above
3. Save

---

## 2️⃣ Configure Algolia Index (1 min)

```bash
npm run algolia:config
```

**Expected output:**
```
✅ Algolia settings applied to index: products_prod
```

---

## 3️⃣ Run Full Reindex (2-5 min)

```bash
export CRON_SECRET="<your_cron_secret>"

curl -X GET http://localhost:3000/api/cron/reindex-algolia \
  -H "x-cron-secret: $CRON_SECRET"
```

**Expected response:**
```json
{
  "ok": true,
  "count": 245,
  "durationMs": 3421
}
```

---

## 4️⃣ Verify Search Works (1 min)

### Test basic search:
```bash
curl "http://localhost:3000/api/search?q=test"
```

### Test with filters:
```bash
curl "http://localhost:3000/api/search?q=test&category=peptides"
```

---

## 5️⃣ Check Algolia Dashboard

1. Go to **Algolia Dashboard** → **Your Index**
2. Click any object in the **Browse** tab
3. Verify these fields exist:
   - ✅ `vendorVerified` (0 or 1)
   - ✅ `inventoryStatus` (in_stock | low | out)
   - ✅ `tags` (array)
   - ✅ `published` (true or false)
   - ✅ `inventoryScore` (0, 1, or 2)

---

## 6️⃣ Test Frontend (1 min)

```bash
npm run dev
```

1. Open http://localhost:3000
2. Type in the **Search** box at top
3. Verify results appear
4. Open DevTools → Network tab
5. Verify API call: GET `/api/search?q=your_query`

---

## 🎯 You're Done! 

### Next: Production Deployment
```bash
git add .
git commit -m "chore: algolia hardening with batch indexing and exact ProductSearchObject"
git push origin main
```

Vercel will auto-deploy. Verify search works in production.

---

## ❌ Troubleshooting (30 sec)

| Problem | Fix |
|---------|-----|
| "Missing ALGOLIA env vars" | Add to `.env.local` + Vercel Dashboard |
| "Search returns 0 hits" | Run reindex cron again |
| "Hook signature error" | ✅ Already fixed (`useSearch({ q: query })`) |
| "Cron returns 401" | Check `CRON_SECRET` matches header |

---

## 📊 What Changed

| Component | Change | Status |
|-----------|--------|--------|
| `prisma/schema.prisma` | Added verified, inventoryStatus, published, tags | ✅ Done |
| `server/services/algolia.ts` | Batch indexing + location caching | ✅ Done |
| `app/api/cron/reindex-algolia` | GET + observability | ✅ Done |
| `useSearch` hook | New options object signature | ✅ Done |
| `package.json` | Removed Shopify | ✅ Done |

---

## 📚 Full Docs

- **IMPLEMENTATION_CHECKLIST.md** — Detailed step-by-step guide
- **ALGOLIA_HARDENING.md** — Technical deep-dive
- **VERIFICATION_REPORT.md** — What was changed and verified
- **verify-algolia.sh** — Automated verification script

---

**Questions?** Check the checklist above or review ALGOLIA_HARDENING.md
