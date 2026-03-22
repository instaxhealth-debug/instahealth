# Shopify Multi-Vendor Migration - Quick Start Guide

## 🎯 TL;DR

**Good news:** Your backend is ALREADY multi-vendor ready! Just need to change Shopify dashboard settings.

**Time required:** 30 minutes (config) + 1 hour (testing)

**Risk level:** LOW (config-only changes)

---

## ✅ Current Architecture (ALREADY CORRECT)

### What Works Today

- ✅ **OAuth:** Accepts ANY shop via `/api/shopify/connect?shop=STORE.myshopify.com`
- ✅ **Tokens:** Each vendor has their own isolated `shopifyAccessToken`
- ✅ **Webhooks:** Automatically route to correct vendor by shop domain
- ✅ **Products:** Complete data isolation using `vendorId` scoping
- ✅ **Security:** Per-vendor OAuth state management

**Proof:**
```typescript
// app/api/shopify/connect/route.ts:49-51
const shop = searchParams.get("shop"); // ✅ DYNAMIC

// prisma/schema.prisma:142-148
model Vendor {
  shopifyShopDomain   String?  // ✅ PER VENDOR
  shopifyAccessToken  String?  // ✅ PER VENDOR
}

// app/api/shopify/webhooks/route.ts:53-58
const vendor = await prisma.vendor.findFirst({
  where: { shopifyShopDomain: shopDomain } // ✅ ROUTES BY SHOP
});
```

**Conclusion:** Backend supports unlimited vendors connecting unlimited stores. Zero code changes needed.

---

## 🚀 Migration Steps (30 Minutes)

### Step 1: Shopify Partner Dashboard (20 min)

**Location:** https://partners.shopify.com → Your App

#### 1.1 Change Distribution

**Go to:** Distribution tab

**Change from:** Custom distribution
**Change to:** **Unlisted** (recommended) or Public

**Why Unlisted:**
- ✅ No app review required
- ✅ Instant activation
- ✅ Full functionality
- ✅ Anyone with link can install

**Why NOT Public (yet):**
- ❌ Requires 1-2 week review
- ❌ Needs privacy policy, support email, etc.
- ✅ Can upgrade later

**Action:** Select "Unlisted distribution" → Save

---

#### 1.2 Configure App URLs

**Go to:** App Setup → URLs

**Set these exactly:**

```
App URL:
https://yourdomain.com/vendor/dashboard

Allowed redirection URLs:
https://yourdomain.com/api/shopify/callback
http://localhost:3000/api/shopify/callback
```

**Critical:**
- ✅ Use your actual production domain
- ✅ HTTPS in production (not http)
- ✅ No trailing slashes
- ✅ Exact match required

---

#### 1.3 Configure Webhooks (Optional)

**Go to:** App Setup → Event Subscriptions

**Add these webhooks:**

| Topic | URL |
|-------|-----|
| `products/create` | `https://yourdomain.com/api/shopify/webhooks` |
| `products/update` | `https://yourdomain.com/api/shopify/webhooks` |
| `products/delete` | `https://yourdomain.com/api/shopify/webhooks` |
| `app/uninstalled` | `https://yourdomain.com/api/shopify/webhooks` |

**Why:** Automatic real-time product sync

---

#### 1.4 Verify API Scopes

**Go to:** Configuration → API Scopes

**Ensure these are checked:**
- ✅ `read_products`
- ✅ `read_inventory`
- ✅ `read_orders`

---

#### 1.5 Copy Credentials

**Go to:** Overview

**Copy these (you'll need them):**
- Client ID
- Client Secret (click "Reveal")
- Webhook signing secret (under Webhooks section)

---

### Step 2: Environment Variables (10 min)

**Platform:** Vercel/Netlify/Your hosting platform

**Add/Update these:**

```bash
# Production app URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Shopify credentials (from Step 1.5)
SHOPIFY_CLIENT_ID=your-client-id-from-dashboard
SHOPIFY_CLIENT_SECRET=your-client-secret-from-dashboard
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret-from-dashboard
```

**Where:**
- Vercel: Settings → Environment Variables
- Netlify: Site settings → Build & deploy → Environment

**Important:** Redeploy after adding env vars

---

## 🧪 Testing (1 Hour)

### Test 1: Single Vendor Install

1. **Get a test Shopify store**
   - Create free dev store at partners.shopify.com
   - Example: `instahealth-test.myshopify.com`

2. **Test OAuth flow:**
   ```
   1. Go to: https://yourdomain.com/vendor/dashboard
   2. Click: "Connect Shopify Store"
   3. Enter: instahealth-test.myshopify.com
   4. Should redirect to Shopify
   5. Click: "Install app"
   6. Should redirect back with "Shopify connected" success
   ```

3. **Verify in database:**
   ```sql
   SELECT name, shopifyConnected, shopifyShopDomain
   FROM "Vendor"
   WHERE shopifyConnected = true;
   ```

   **Expected:** See vendor with connected shop

4. **Test product sync:**
   - Add 2-3 products in Shopify admin
   - Click "Sync Now" in vendor dashboard
   - Verify products appear in InstaHealth

---

### Test 2: Multi-Vendor Isolation

**Critical test for marketplace model**

1. **Create 2 test vendors** in InstaHealth
2. **Create 2 test Shopify stores**
   - Store A: `vendor-a-test.myshopify.com`
   - Store B: `vendor-b-test.myshopify.com`

3. **Connect each vendor to different store:**
   - Vendor A → Store A
   - Vendor B → Store B

4. **Add different products in each store:**
   - Store A: Product "Apple"
   - Store B: Product "Banana"

5. **Sync both vendors**

6. **Verify isolation:**
   ```sql
   -- Vendor A should only see "Apple"
   SELECT name FROM "Product"
   WHERE vendorId = 'vendor-a-id';

   -- Vendor B should only see "Banana"
   SELECT name FROM "Product"
   WHERE vendorId = 'vendor-b-id';
   ```

**Expected:** ✅ Complete data isolation, no cross-contamination

---

### Test 3: Webhooks

1. **Update product in Shopify admin** (change price or description)
2. **Check InstaHealth** - should update automatically within 1 minute
3. **Check server logs** - should see webhook processing logs

**Expected:** Real-time sync without manual "Sync Now" click

---

## 📋 Migration Checklist

### Pre-Migration
- [ ] Read full migration doc: `SHOPIFY_MULTI_VENDOR_MIGRATION.md`
- [ ] Backup production database
- [ ] Have test Shopify store ready

### Shopify Dashboard
- [ ] Switch distribution to Unlisted
- [ ] Set App URL: `https://yourdomain.com/vendor/dashboard`
- [ ] Set redirect URL: `https://yourdomain.com/api/shopify/callback`
- [ ] Configure webhooks (optional)
- [ ] Copy Client ID, Secret, Webhook Secret

### Environment
- [ ] Add `NEXT_PUBLIC_APP_URL` to production
- [ ] Add `SHOPIFY_CLIENT_ID` to production
- [ ] Add `SHOPIFY_CLIENT_SECRET` to production
- [ ] Add `SHOPIFY_WEBHOOK_SECRET` to production
- [ ] Redeploy app

### Testing
- [ ] Test single vendor OAuth flow
- [ ] Test product sync
- [ ] Test multi-vendor isolation (2 vendors, 2 stores)
- [ ] Test webhooks (update product in Shopify)
- [ ] Test disconnect flow

### Go Live
- [ ] Monitor logs for 24 hours
- [ ] Test with 1-2 real vendors
- [ ] Update vendor onboarding docs

---

## 🚨 Common Issues & Solutions

### Issue: "redirect_uri is not whitelisted"

**Cause:** Mismatch between code and Shopify dashboard

**Solution:**
1. Check server logs for exact `SHOPIFY_REDIRECT_URI` being generated
2. Copy that EXACT URL to Shopify dashboard → Allowed redirection URLs
3. Common mismatches:
   - `http://` vs `https://`
   - `www.yourdomain.com` vs `yourdomain.com`
   - Trailing slash: `/callback/` vs `/callback`

**See:** `docs/SHOPIFY_OAUTH_FIX.md` for detailed fix

---

### Issue: Webhooks not working

**Possible causes:**
1. ❌ Webhook URL not HTTPS in production
2. ❌ `SHOPIFY_WEBHOOK_SECRET` not set
3. ❌ Signature verification failing

**Solution:**
```bash
# Check server logs for webhook errors
# Should see: "Processing webhook: products/update for vendor xxx"

# Test webhook endpoint manually
curl -X POST https://yourdomain.com/api/shopify/webhooks \
  -H "x-shopify-topic: products/update" \
  -H "x-shopify-shop-domain: test.myshopify.com" \
  -H "x-shopify-hmac-sha256: test" \
  -H "content-type: application/json" \
  -d '{"id": 123}'

# Should return 401 (signature invalid) not 500 or 404
```

---

### Issue: Products not syncing for vendor

**Possible causes:**
1. ❌ Vendor's shop domain not saved correctly
2. ❌ Access token missing or invalid
3. ❌ Product category not in vendor's allowed categories

**Solution:**
```sql
-- Check vendor Shopify connection
SELECT
  name,
  shopifyConnected,
  shopifyShopDomain,
  shopifyAccessToken IS NOT NULL as hasToken,
  shopifySyncStatus,
  allowedCategories
FROM "Vendor"
WHERE id = 'vendor-id';

-- Check sync logs
# Server logs should show:
# [SHOPIFY_SYNC] Processing product xxx for vendor yyy
```

---

## 🎯 Success Criteria

After migration, you should have:

### Vendor Experience
- ✅ Any vendor can connect their Shopify store in 3 clicks
- ✅ Products sync automatically on first install
- ✅ Updates propagate via webhooks (no manual sync needed)
- ✅ Complete isolation between vendors
- ✅ No manual intervention from InstaHealth team

### Technical Metrics
- ✅ Unlimited vendors can connect
- ✅ Unlimited shops supported
- ✅ OAuth flow works for any shop domain
- ✅ Webhooks route to correct vendor
- ✅ Zero cross-vendor data leakage
- ✅ Scalable marketplace architecture

### Operations
- ✅ Zero manual shop approvals
- ✅ Zero custom configuration per vendor
- ✅ Zero code changes when adding vendors
- ✅ Self-service vendor onboarding

---

## 📚 Additional Resources

- **Full Migration Guide:** `docs/SHOPIFY_MULTI_VENDOR_MIGRATION.md`
- **OAuth Fix Details:** `docs/SHOPIFY_OAUTH_FIX.md`
- **Quick Reference:** `docs/SHOPIFY_OAUTH_QUICK_REFERENCE.md`

---

## 🆘 Need Help?

**Shopify Documentation:**
- [App Distribution](https://shopify.dev/docs/apps/launch/distribution)
- [OAuth Flow](https://shopify.dev/docs/apps/auth/oauth)
- [Webhooks](https://shopify.dev/docs/apps/webhooks)

**Internal Code References:**
- OAuth flow: `app/api/shopify/connect/route.ts`
- Callback: `app/api/shopify/callback/route.ts`
- Webhooks: `app/api/shopify/webhooks/route.ts`
- Product sync: `lib/shopify/sync-service.ts`
- Database: `prisma/schema.prisma` (Vendor model, lines 110-159)

---

## 🎉 Ready to Migrate?

**Recommended order:**

1. ☑️ Read this guide (10 min) ← YOU ARE HERE
2. ☑️ Read full migration doc (20 min)
3. ☑️ Make Shopify dashboard changes (20 min)
4. ☑️ Update environment variables (10 min)
5. ☑️ Deploy (5 min)
6. ☑️ Test with test stores (1 hour)
7. ☑️ Go live with real vendors (ongoing)

**Total time:** 2-3 hours from start to production

**Risk level:** 🟢 LOW (config changes only, easy rollback)

**Expected outcome:** Scalable multi-vendor Shopify marketplace! 🚀
