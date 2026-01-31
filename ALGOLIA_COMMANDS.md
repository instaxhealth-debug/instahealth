# Algolia: Essential Commands Reference

## Quick Commands

### 1. Local Development Setup
```bash
npm run dev
```

### 2. Apply Database Migration (Already Done ✅)
```bash
npm run db:push
```

### 3. Configure Algolia Index
```bash
npm run algolia:config
```

### 4. Test Cron (Full Reindex)
```bash
export CRON_SECRET="your_secret_here"
curl -X GET http://localhost:3000/api/cron/reindex-algolia \
  -H "x-cron-secret: $CRON_SECRET"
```

---

## Search API Testing

### Basic Search
```bash
curl "http://localhost:3000/api/search?q=bpc"
```

### With Category Filter
```bash
curl "http://localhost:3000/api/search?q=bpc&category=peptides"
```

### With Vendor Filter
```bash
curl "http://localhost:3000/api/search?q=bpc&vendorId=vendor_id"
```

### With Location Filter
```bash
curl "http://localhost:3000/api/search?q=bpc&locationId=location_id"
```

---

## Database Commands

### Open Prisma Studio
```bash
npm run db:studio
```

### Check Schema
```bash
npm run prisma validate
```

---

## Environment Variables Needed

```bash
# Add to .env.local
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_KEY=your_admin_key
ALGOLIA_PRODUCTS_INDEX=products_prod
CRON_SECRET=your_random_secret
```

---

## Documentation Files

- **QUICK_START_ALGOLIA.md** — 5-minute setup guide
- **ALGOLIA_HARDENING.md** — Technical deep-dive
- **IMPLEMENTATION_CHECKLIST.md** — Detailed checklist
- **VERIFICATION_REPORT.md** — What was verified
- **ALGOLIA_SUMMARY.md** — Complete summary

---

## Key Status

✅ Database migration applied  
✅ Schema fields added (verified, inventoryStatus, published, tags)  
✅ Batch indexing optimized (300 objects per call)  
✅ Cron endpoint enhanced (GET + POST with timing)  
✅ Hook signature fixed (useSearch({ q, category?, vendorId?, locationId? }))  
✅ Shopify dependency removed  

**Next**: Set env vars and run algolia:config
