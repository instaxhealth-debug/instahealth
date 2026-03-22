# Shopify Multi-Vendor Distribution Migration Plan

## 🎯 Executive Summary

**Current State:** Custom distribution model suitable only for single-store testing

**Target State:** Public/Unlisted app distribution supporting unlimited vendor stores

**Good News:** ✅ Backend is ALREADY architected for multi-vendor! No major code changes needed.

**Migration Complexity:** LOW - Primarily Shopify dashboard configuration changes

---

## 📊 AUDIT RESULTS

### ✅ What's ALREADY CORRECT (Multi-Vendor Ready)

#### 1. **OAuth Flow - FULLY DYNAMIC** ✅

**File:** `app/api/shopify/connect/route.ts:49-51`

```typescript
// Get shop parameter from query string
const searchParams = request.nextUrl.searchParams;
const shop = searchParams.get("shop");
```

**Status:** ✅ **PERFECT** - OAuth flow accepts ANY shop domain via URL parameter

**How it works:**
- Vendor visits: `/api/shopify/connect?shop=vendorstore.myshopify.com`
- Backend dynamically generates authorization URL for THAT specific shop
- Each vendor connects their own unique store

**No changes needed.**

---

#### 2. **Token Storage - PER-VENDOR** ✅

**Database Schema:** `prisma/schema.prisma:110-159`

```prisma
model Vendor {
  id                       String    @id @default(cuid())
  // ... vendor fields ...
  shopifyConnected         Boolean   @default(false)
  shopifyShopDomain        String?   // ✅ Unique per vendor
  shopifyAccessToken       String?   // ✅ Unique per vendor
  shopifyScopes            String?   // ✅ Unique per vendor
  shopifyInstalledAt       DateTime?
  shopifyLastSyncAt        DateTime?
  shopifySyncStatus        String?
}
```

**Status:** ✅ **PERFECT** - Each vendor has their own isolated Shopify connection

**How it works:**
- Each `Vendor` row stores its own `shopifyAccessToken`
- Tokens are never shared between vendors
- One vendor = one shop domain = one access token

**No changes needed.**

---

#### 3. **Webhook Routing - PER-VENDOR** ✅

**File:** `app/api/shopify/webhooks/route.ts:53-64`

```typescript
// Find vendor by shop domain
const vendor = await prisma.vendor.findFirst({
  where: {
    shopifyShopDomain: shopDomain,  // ✅ Routes by shop domain
    shopifyConnected: true,
  },
});
```

**Status:** ✅ **PERFECT** - Webhooks automatically route to correct vendor

**How it works:**
- Shopify sends webhook with `x-shopify-shop-domain` header
- Backend finds vendor by `shopifyShopDomain`
- Updates are applied only to that vendor's products

**No changes needed.**

---

#### 4. **Product Isolation - PER-VENDOR** ✅

**File:** `lib/shopify/sync-service.ts:184-193`

```typescript
// Atomic upsert using vendorId_externalVariantId composite unique constraint
const upsertResult = await prisma.product.upsert({
  where: {
    vendorId_externalVariantId: {
      vendorId: vendor.id,           // ✅ Scoped to vendor
      externalVariantId: variant.id,
    },
  },
  update: productData,
  create: productData,
});
```

**Status:** ✅ **PERFECT** - Products are scoped by vendorId

**How it works:**
- Each product is uniquely identified by `(vendorId, externalVariantId)`
- Two vendors can sync the same Shopify product without collision
- Complete data isolation between vendors

**No changes needed.**

---

#### 5. **OAuth State Management - PER-VENDOR** ✅

**Database Schema:** `prisma/schema.prisma`

```prisma
model ShopifyOAuthState {
  nonce      String   @id
  vendorId   String   // ✅ Tied to specific vendor
  timestamp  BigInt
  createdAt  DateTime @default(now())
}
```

**Status:** ✅ **PERFECT** - OAuth state is vendor-specific

**How it works:**
- Each OAuth flow creates a nonce tied to a specific `vendorId`
- State verification ensures token goes to correct vendor
- Prevents cross-vendor token injection attacks

**No changes needed.**

---

### ❌ What Needs to Change

#### 1. **Shopify App Distribution Model** ❌

**Current:** Custom distribution (test store only)

**Problem:** Only works with stores explicitly added to test list

**Solution:** Switch to public/unlisted distribution

---

#### 2. **Documentation Assumptions** ⚠️

**File:** `docs/SHOPIFY_OAUTH_FIX.md`

**Current assumptions:**
- Single production domain
- Single store testing

**Solution:** Update docs to clarify multi-vendor capability

---

## 🚀 MIGRATION PLAN

### Phase 1: Shopify Partner Dashboard Configuration

**Timeline:** 30 minutes

**No App Review Required** (for unlisted distribution)

#### Step 1.1: Change Distribution Type

**Location:** Shopify Partner Dashboard → Your App → Distribution

**Action:**

1. Navigate to **Distribution** tab
2. Select **Public distribution** or **Unlisted distribution**
   - **Public:** Listed in Shopify App Store (requires review)
   - **Unlisted:** Anyone with install link can install (NO review required)
3. **Recommended:** Choose **Unlisted** for faster deployment

**Why this matters:**
- Custom distribution only works with pre-approved test stores
- Unlisted distribution allows ANY Shopify store to install
- No approval process for unlisted apps

---

#### Step 1.2: Configure App URLs

**Location:** Shopify Partner Dashboard → Your App → App Setup → URLs

**Required URLs:**

```
App URL:
https://yourdomain.com/vendor/dashboard

Allowed redirection URLs:
https://yourdomain.com/api/shopify/callback
http://localhost:3000/api/shopify/callback (for development)
```

**Critical Rules:**
- ✅ Use production domain (not localhost) for production app
- ✅ Both URLs must use HTTPS in production
- ✅ No trailing slashes
- ✅ Exact match required (case-sensitive)

---

#### Step 1.3: Configure Webhooks (Optional but Recommended)

**Location:** Shopify Partner Dashboard → Your App → App Setup → Event Subscriptions

**Recommended webhooks:**

```
products/create   → https://yourdomain.com/api/shopify/webhooks
products/update   → https://yourdomain.com/api/shopify/webhooks
products/delete   → https://yourdomain.com/api/shopify/webhooks
app/uninstalled   → https://yourdomain.com/api/shopify/webhooks
```

**Why:**
- Automatic product sync when vendors update products
- Graceful cleanup when vendors uninstall
- Real-time inventory updates

---

#### Step 1.4: Set API Scopes

**Location:** Shopify Partner Dashboard → Your App → Configuration → API Scopes

**Current scopes:** (from code)
```
read_products
read_inventory
read_orders
```

**Verify these are enabled in dashboard.**

---

### Phase 2: Environment Variables (Production)

**Timeline:** 5 minutes

#### Update Production Environment Variables

**Platform:** Vercel/Netlify/Your hosting platform

**Required variables:**

```bash
# App URL (production domain)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Shopify App Credentials
SHOPIFY_CLIENT_ID=your-production-client-id
SHOPIFY_CLIENT_SECRET=your-production-client-secret
SHOPIFY_WEBHOOK_SECRET=your-webhook-signing-secret

# Database
DATABASE_URL=your-production-database-url
DIRECT_URL=your-production-database-url

# Auth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret
```

**Where to find Shopify credentials:**
- **Client ID:** Shopify Partner Dashboard → Your App → Overview
- **Client Secret:** Shopify Partner Dashboard → Your App → Overview (click "Reveal")
- **Webhook Secret:** Shopify Partner Dashboard → Your App → Overview

---

### Phase 3: Code Changes (Optional Improvements)

**Timeline:** 15 minutes

**Status:** ✅ No critical code changes required

**Optional enhancements:**

#### Enhancement 1: Add App Install Link Generator

**File:** `components/vendor/ShopifyConnection.tsx:36`

**Current:** User manually enters shop domain via prompt

**Improvement:** Generate standard Shopify app install link

```typescript
// OPTIONAL: Add install link method
const getInstallUrl = (shop: string) => {
  const clientId = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/shopify/callback`;
  const scopes = "read_products,read_inventory,read_orders";

  return `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
};
```

**Why:** Standard Shopify install flow (but current approach works fine)

---

#### Enhancement 2: Add Multiple Store Support Per Vendor (Future)

**Current:** Each vendor can connect ONE Shopify store

**Future Enhancement:** Allow one vendor to connect multiple stores

**Schema change needed:**

```prisma
// Future: Multi-store support
model ShopifyStore {
  id                String   @id @default(cuid())
  vendorId          String
  shopDomain        String   @unique
  accessToken       String
  scopes            String
  installedAt       DateTime
  lastSyncAt        DateTime?
  syncStatus        String

  vendor            Vendor   @relation(fields: [vendorId], references: [id])

  @@index([vendorId])
}
```

**Status:** NOT NEEDED NOW - Current one-store-per-vendor model works for MVP

---

### Phase 4: Testing & Deployment

**Timeline:** 1 hour

#### Step 4.1: Test with Real Shopify Store

1. **Create a test Shopify store** (if you don't have one)
   - Go to shopify.com
   - Sign up for free development store
   - Example: `instahealth-test.myshopify.com`

2. **Test OAuth flow:**
   ```
   1. Visit: https://yourdomain.com/vendor/dashboard
   2. Click "Connect Shopify Store"
   3. Enter: instahealth-test.myshopify.com
   4. Should redirect to Shopify authorization page
   5. Click "Install app"
   6. Should redirect back with success
   ```

3. **Verify in database:**
   ```sql
   SELECT id, name, shopifyConnected, shopifyShopDomain
   FROM "Vendor"
   WHERE shopifyConnected = true;
   ```

4. **Test product sync:**
   - Add products in Shopify admin
   - Click "Sync Now" in vendor dashboard
   - Verify products appear in InstaHealth

5. **Test webhooks:**
   - Update product in Shopify
   - Verify update propagates to InstaHealth automatically

---

#### Step 4.2: Test with Multiple Vendors

**Critical test:** Verify multi-vendor isolation

1. **Create 2 test vendors** in InstaHealth
2. **Connect each to different Shopify stores:**
   - Vendor A → `store-a.myshopify.com`
   - Vendor B → `store-b.myshopify.com`
3. **Verify isolation:**
   - Vendor A sees only Store A products
   - Vendor B sees only Store B products
   - Webhooks route correctly
   - No cross-contamination

**Expected result:** ✅ Complete data isolation

---

#### Step 4.3: Deploy to Production

```bash
# 1. Set environment variables in hosting platform
# (see Phase 2 above)

# 2. Deploy
git add .
git commit -m "feat: enable multi-vendor Shopify distribution"
git push origin main

# 3. Verify deployment
curl https://yourdomain.com/api/shopify/connect?shop=test.myshopify.com
# Should redirect to Shopify OAuth (not error)
```

---

### Phase 5: Vendor Onboarding

**Timeline:** Ongoing

#### Onboarding Flow for New Vendors

**Vendor-side steps:**

1. **Register as vendor** on InstaHealth
2. **Navigate to dashboard** → Shopify Integration
3. **Click "Connect Shopify Store"**
4. **Enter their shop domain** (e.g., `theirstore.myshopify.com`)
5. **Authorize app** on Shopify
6. **Products sync automatically**

**InstaHealth-side automation:**

- ✅ OAuth flow handles everything automatically
- ✅ Access token stored securely per vendor
- ✅ Products synced on first install
- ✅ Webhooks keep products updated
- ✅ No manual configuration needed

---

## 📋 MIGRATION CHECKLIST

### Pre-Migration

- [ ] Backup production database
- [ ] Document current test store setup
- [ ] Note any hardcoded shop domains (NONE FOUND ✅)

### Shopify Dashboard Changes

- [ ] Switch app distribution to **Unlisted** (or Public if you want App Store listing)
- [ ] Set App URL: `https://yourdomain.com/vendor/dashboard`
- [ ] Set redirect URL: `https://yourdomain.com/api/shopify/callback`
- [ ] Configure webhooks (optional but recommended)
- [ ] Verify API scopes: `read_products,read_inventory,read_orders`
- [ ] Copy Client ID, Client Secret, Webhook Secret

### Environment Variables

- [ ] Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com` in production
- [ ] Set `SHOPIFY_CLIENT_ID` from dashboard
- [ ] Set `SHOPIFY_CLIENT_SECRET` from dashboard
- [ ] Set `SHOPIFY_WEBHOOK_SECRET` from dashboard
- [ ] Verify all env vars in hosting platform (Vercel/Netlify)

### Testing

- [ ] Test OAuth flow with real Shopify store
- [ ] Verify database stores vendor-specific tokens
- [ ] Test product sync
- [ ] Test webhooks (update product in Shopify)
- [ ] Test multi-vendor isolation (2+ vendors, 2+ stores)
- [ ] Test disconnect flow
- [ ] Check server logs for errors

### Deployment

- [ ] Deploy to production
- [ ] Monitor error logs for 24 hours
- [ ] Test with 1-2 real vendors

### Post-Migration

- [ ] Update vendor documentation
- [ ] Update internal docs
- [ ] Remove custom distribution test store (if applicable)
- [ ] Celebrate 🎉

---

## 🎯 EXPECTED OUTCOMES

### Before Migration (Custom Distribution)

```
❌ Only pre-approved test stores can install
❌ Manual store approval required
❌ Not scalable for marketplace
❌ Limited to development/testing
```

### After Migration (Public/Unlisted Distribution)

```
✅ ANY Shopify store can install app
✅ Zero manual approval process
✅ Fully scalable marketplace model
✅ Production-ready for all vendors
✅ One app → unlimited stores
```

---

## 🚨 IMPORTANT NOTES

### 1. **App Review** (ONLY if choosing Public distribution)

**Public distribution:** Listed in Shopify App Store
- **Requires:** Shopify app review (1-2 weeks)
- **Benefits:** Discoverability, Shopify App Store listing
- **Requirements:** Privacy policy, support email, app description

**Unlisted distribution:** NOT listed in App Store
- **Requires:** NO review
- **Benefits:** Instant activation, full functionality
- **How vendors install:** Share direct install link

**Recommendation for InstaHealth:**
- **Start with Unlisted** (no review, instant activation)
- **Upgrade to Public later** if you want App Store visibility

---

### 2. **No Code Changes Required**

**Critical finding:** Your backend is ALREADY multi-vendor ready!

**Proof:**
- ✅ OAuth flow accepts dynamic shop parameter
- ✅ Tokens stored per vendor in database
- ✅ Webhooks route by shop domain
- ✅ Products scoped by vendorId
- ✅ Complete data isolation

**Required changes:** ONLY Shopify dashboard configuration

---

### 3. **Custom Distribution Can Stay for Testing**

**You can keep both:**
- **Custom distribution:** For your test stores during development
- **Unlisted distribution:** For production vendor installs

**How:** Shopify allows multiple distribution channels simultaneously

**Recommendation:**
- Keep custom distribution active for internal testing
- Add unlisted distribution for production vendors

---

### 4. **Webhook URL Must Be HTTPS in Production**

**Development:** `http://localhost:3000/api/shopify/webhooks` (OK for testing)

**Production:** `https://yourdomain.com/api/shopify/webhooks` (REQUIRED)

**Why:** Shopify requires HTTPS for production webhooks

---

### 5. **OAuth Redirect URL Is Critical**

**Must match exactly:**
- ✅ Same protocol (https)
- ✅ Same domain (yourdomain.com vs www.yourdomain.com)
- ✅ Same path (/api/shopify/callback)
- ✅ No trailing slash
- ✅ No query parameters

**Current code handles this correctly** (see `SHOPIFY_OAUTH_FIX.md`)

---

## 📊 MIGRATION COMPLEXITY MATRIX

| Component | Status | Changes Required | Risk Level |
|-----------|--------|------------------|------------|
| OAuth Flow | ✅ Ready | None | 🟢 Zero |
| Token Storage | ✅ Ready | None | 🟢 Zero |
| Webhook Routing | ✅ Ready | None | 🟢 Zero |
| Product Sync | ✅ Ready | None | 🟢 Zero |
| Database Schema | ✅ Ready | None | 🟢 Zero |
| Shopify Dashboard | ❌ Not Ready | Config only | 🟡 Low |
| Environment Variables | ⚠️ Partial | Production vars | 🟡 Low |
| Documentation | ⚠️ Outdated | Update docs | 🟢 Zero |

**Overall Risk:** 🟢 **LOW** - Primarily configuration changes

---

## 🎉 CONCLUSION

### Summary

**Current state:**
- Backend is ALREADY architected perfectly for multi-vendor
- Only blocker is Shopify app distribution configuration

**Migration effort:**
- **Time:** 2 hours (including testing)
- **Code changes:** 0 required, minor optional enhancements
- **Risk:** Low (config-only changes)
- **Rollback:** Easy (revert Shopify dashboard settings)

### Next Steps

1. **Immediate:** Switch Shopify app to unlisted distribution (30 min)
2. **Short-term:** Test with 2-3 real vendors (1 hour)
3. **Long-term:** Consider public distribution for App Store listing

### Success Metrics

After migration, you should be able to:
- ✅ Onboard unlimited vendors
- ✅ Each vendor connects their own Shopify store
- ✅ Zero manual intervention required
- ✅ Complete data isolation between vendors
- ✅ Webhooks work automatically for all stores
- ✅ Scalable marketplace model achieved

**Your codebase is already production-ready for multi-vendor Shopify integration!** 🚀
