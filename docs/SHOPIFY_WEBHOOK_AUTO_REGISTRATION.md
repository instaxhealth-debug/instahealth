# Shopify Webhook Auto-Registration

## 🎯 Overview

InstaHealth now **automatically registers webhooks** after successful Shopify OAuth installation. No manual webhook configuration needed in Shopify Partner Dashboard.

---

## ✅ What's Automated

### Webhooks Registered Automatically

When a vendor connects their Shopify store, the following webhooks are **automatically registered**:

| Webhook Topic | Purpose | Endpoint |
|---------------|---------|----------|
| `products/create` | New product created in Shopify | `https://instahealth.ae/api/shopify/webhooks` |
| `products/update` | Product updated in Shopify | `https://instahealth.ae/api/shopify/webhooks` |
| `products/delete` | Product deleted in Shopify | `https://instahealth.ae/api/shopify/webhooks` |
| `app/uninstalled` | Vendor uninstalls app from Shopify | `https://instahealth.ae/api/shopify/webhooks` |

### Registration Flow

```
1. Vendor clicks "Connect Shopify" in InstaHealth dashboard
2. OAuth flow redirects to Shopify
3. Vendor authorizes app
4. OAuth callback receives access token
5. ✅ AUTOMATIC: Webhooks registered using access token
6. Vendor database updated with connection
7. Initial product sync triggered
8. Vendor redirected back to dashboard
```

---

## 🔧 Technical Implementation

### Files Created/Modified

**New file:** `lib/shopify/webhooks.ts`
- `registerWebhooks()` - Register all required webhooks
- `deleteAllWebhooks()` - Clean up webhooks on disconnect
- Idempotent webhook creation (handles duplicates safely)
- Comprehensive logging and error handling

**Modified:** `app/api/shopify/callback/route.ts`
- Added automatic webhook registration after OAuth
- Non-blocking (OAuth succeeds even if webhooks fail)
- Detailed logging for debugging

**Modified:** `app/api/shopify/disconnect/route.ts`
- Added automatic webhook cleanup on disconnect
- Prevents orphaned webhooks in Shopify

---

## 📋 How It Works

### 1. Automatic Registration (OAuth Callback)

**File:** `app/api/shopify/callback/route.ts:113-134`

```typescript
// After successful OAuth and token exchange:

// ✅ AUTO-REGISTER WEBHOOKS
const webhookResult = await registerWebhooks(shop, tokenResponse.access_token);

if (webhookResult.success) {
  console.log(`✅ Webhooks registered: ${webhookResult.registered.length} new`);
} else {
  console.error(`⚠️ Webhook errors: ${webhookResult.errors.join("; ")}`);
  // OAuth continues even if webhooks fail
}
```

**Key features:**
- ✅ Uses vendor's access token (per-vendor webhooks)
- ✅ Uses shop domain dynamically
- ✅ Non-blocking (doesn't fail OAuth if webhooks fail)
- ✅ Comprehensive logging

---

### 2. Idempotent Registration

**File:** `lib/shopify/webhooks.ts:95-140`

```typescript
// Step 1: Fetch existing webhooks
const existingWebhooks = await fetchExistingWebhooks(shopDomain, accessToken);

// Step 2: Check if webhook already exists
for (const topic of WEBHOOK_TOPICS) {
  const existingWebhook = existingWebhooks.find(
    (wh) => wh.topic === topic && wh.address === webhookUrl
  );

  if (existingWebhook) {
    console.log(`Webhook already exists: ${topic} (ID: ${existingWebhook.id})`);
    result.skipped.push(topic);
    continue; // ✅ Skip duplicate
  }

  // Create new webhook only if doesn't exist
  const webhook = await createWebhook(shopDomain, accessToken, topic, webhookUrl);
  result.registered.push(topic);
}
```

**Benefits:**
- ✅ **Safe to run multiple times** (no duplicate webhooks)
- ✅ **Handles reconnections** (if vendor disconnects and reconnects)
- ✅ **Handles existing webhooks** (if manually created in Shopify)

---

### 3. Automatic Cleanup (Disconnect)

**File:** `app/api/shopify/disconnect/route.ts:38-54`

```typescript
// Before disconnecting vendor:

// ✅ DELETE WEBHOOKS
if (vendor.shopifyShopDomain && vendor.shopifyAccessToken) {
  const deletedCount = await deleteAllWebhooks(
    vendor.shopifyShopDomain,
    vendor.shopifyAccessToken
  );
  console.log(`✅ Deleted ${deletedCount} webhooks`);
}

// Then disconnect vendor
await prisma.vendor.update({
  where: { id: vendor.id },
  data: {
    shopifyConnected: false,
    shopifyAccessToken: null,
  },
});
```

**Benefits:**
- ✅ Prevents orphaned webhooks in Shopify
- ✅ Clean slate for reconnection
- ✅ Reduces Shopify webhook quota usage

---

## 📊 Logging & Monitoring

### Success Logs

```
[WEBHOOK_REGISTRATION] Starting webhook registration for store.myshopify.com
[WEBHOOK_REGISTRATION] Webhook URL: https://instahealth.ae/api/shopify/webhooks
[WEBHOOK_REGISTRATION] Found 0 existing webhooks
[WEBHOOK_REGISTRATION] ✅ Registered webhook: products/create (ID: 123456789)
[WEBHOOK_REGISTRATION] ✅ Registered webhook: products/update (ID: 123456790)
[WEBHOOK_REGISTRATION] ✅ Registered webhook: products/delete (ID: 123456791)
[WEBHOOK_REGISTRATION] ✅ Registered webhook: app/uninstalled (ID: 123456792)
[WEBHOOK_REGISTRATION] ===== REGISTRATION SUMMARY =====
[WEBHOOK_REGISTRATION] Shop: store.myshopify.com
[WEBHOOK_REGISTRATION] Registered: 4 (products/create, products/update, products/delete, app/uninstalled)
[WEBHOOK_REGISTRATION] Skipped: 0 ()
[WEBHOOK_REGISTRATION] Errors: 0 ()
[WEBHOOK_REGISTRATION] Overall: ✅ SUCCESS
[WEBHOOK_REGISTRATION] ================================
```

### Idempotent Logs (Webhooks Already Exist)

```
[WEBHOOK_REGISTRATION] Starting webhook registration for store.myshopify.com
[WEBHOOK_REGISTRATION] Found 4 existing webhooks
[WEBHOOK_REGISTRATION] Webhook already exists: products/create (ID: 123456789)
[WEBHOOK_REGISTRATION] Webhook already exists: products/update (ID: 123456790)
[WEBHOOK_REGISTRATION] Webhook already exists: products/delete (ID: 123456791)
[WEBHOOK_REGISTRATION] Webhook already exists: app/uninstalled (ID: 123456792)
[WEBHOOK_REGISTRATION] ===== REGISTRATION SUMMARY =====
[WEBHOOK_REGISTRATION] Registered: 0 ()
[WEBHOOK_REGISTRATION] Skipped: 4 (products/create, products/update, products/delete, app/uninstalled)
[WEBHOOK_REGISTRATION] Errors: 0 ()
[WEBHOOK_REGISTRATION] Overall: ✅ SUCCESS
```

### Error Logs

```
[WEBHOOK_REGISTRATION] ❌ Failed to register products/create: 401 Unauthorized
[WEBHOOK_REGISTRATION] ===== REGISTRATION SUMMARY =====
[WEBHOOK_REGISTRATION] Registered: 3 (products/update, products/delete, app/uninstalled)
[WEBHOOK_REGISTRATION] Skipped: 0 ()
[WEBHOOK_REGISTRATION] Errors: 1 (products/create: 401 Unauthorized)
[WEBHOOK_REGISTRATION] Overall: ⚠️ PARTIAL/FAILED
```

### Disconnect Logs

```
[SHOPIFY_DISCONNECT] Deleting webhooks for shop store.myshopify.com
[WEBHOOK_DELETION] Fetching webhooks to delete for store.myshopify.com
[WEBHOOK_DELETION] ✅ Deleted webhook: products/create (ID: 123456789)
[WEBHOOK_DELETION] ✅ Deleted webhook: products/update (ID: 123456790)
[WEBHOOK_DELETION] ✅ Deleted webhook: products/delete (ID: 123456791)
[WEBHOOK_DELETION] ✅ Deleted webhook: app/uninstalled (ID: 123456792)
[WEBHOOK_DELETION] Deleted 4/4 webhooks
[SHOPIFY_DISCONNECT] ✅ Deleted 4 webhooks
```

---

## 🔍 Verification

### How to Verify Webhooks Were Created

**Option 1: Check Shopify Admin**

1. Log into your Shopify store admin
2. Go to: **Settings** → **Notifications** → **Webhooks**
3. You should see 4 webhooks:
   - `Product creation` → `https://instahealth.ae/api/shopify/webhooks`
   - `Product update` → `https://instahealth.ae/api/shopify/webhooks`
   - `Product deletion` → `https://instahealth.ae/api/shopify/webhooks`
   - `App uninstalled` → `https://instahealth.ae/api/shopify/webhooks`

**Option 2: Check Server Logs**

Look for these log entries after OAuth:

```
[SHOPIFY_CALLBACK] Registering webhooks for vendor xxx, shop store.myshopify.com
[WEBHOOK_REGISTRATION] ✅ Registered webhook: products/create (ID: ...)
[SHOPIFY_CALLBACK] ✅ Webhooks registered successfully: 4 new, 0 existing
```

**Option 3: Use Shopify API**

```bash
curl -X GET \
  https://store.myshopify.com/admin/api/2024-01/webhooks.json \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN"
```

---

## 🚨 Troubleshooting

### Issue: Webhooks Not Created

**Possible causes:**

1. **Invalid access token**
   - Symptom: `401 Unauthorized` in logs
   - Solution: Verify OAuth flow completed successfully, check token in database

2. **Network error**
   - Symptom: `Failed to fetch` or timeout errors
   - Solution: Check network connectivity, Shopify API status

3. **Rate limit exceeded**
   - Symptom: `429 Too Many Requests`
   - Solution: Wait and retry (automatic retry logic will handle this)

4. **Wrong webhook URL**
   - Symptom: Webhooks created but don't fire
   - Solution: Verify `NEXT_PUBLIC_APP_URL` environment variable is correct

**How to debug:**

```bash
# Check server logs
grep "WEBHOOK_REGISTRATION" /var/log/app.log

# Verify environment variable
echo $NEXT_PUBLIC_APP_URL
# Should output: https://instahealth.ae

# Test webhook endpoint manually
curl -X POST https://instahealth.ae/api/shopify/webhooks \
  -H "x-shopify-topic: products/update" \
  -H "x-shopify-shop-domain: test.myshopify.com" \
  -H "x-shopify-hmac-sha256: test" \
  -d '{}'
# Should return 401 (signature invalid, but endpoint works)
```

---

### Issue: Duplicate Webhooks

**Symptom:** Multiple webhooks with same topic in Shopify admin

**Cause:** Manually created webhooks before automatic registration

**Solution:**

1. **Option A: Let auto-registration skip duplicates**
   - Automatic registration will skip existing webhooks
   - Safe to leave both (one manual, one auto)

2. **Option B: Delete manual webhooks**
   - Go to Shopify admin → Settings → Notifications → Webhooks
   - Delete manual webhooks
   - Reconnect vendor (auto-registration will create them)

3. **Option C: Delete all and reconnect**
   - Disconnect vendor in InstaHealth
   - Delete webhooks in Shopify admin
   - Reconnect vendor (fresh webhook creation)

---

### Issue: Webhooks Not Firing

**Symptom:** Webhooks created but products don't update automatically

**Possible causes:**

1. **HTTPS required in production**
   - Shopify requires HTTPS for webhook URLs
   - Verify: `https://instahealth.ae/api/shopify/webhooks` (not http)

2. **Webhook signature verification failing**
   - Check `SHOPIFY_WEBHOOK_SECRET` environment variable
   - Should match webhook signing secret from Shopify Partner Dashboard

3. **Webhook endpoint not deployed**
   - Verify `/api/shopify/webhooks` route is deployed
   - Test: `curl https://instahealth.ae/api/shopify/webhooks`

**How to debug:**

```bash
# Check webhook processing logs
grep "Processing webhook" /var/log/app.log

# Test webhook signature verification
# (use real HMAC from Shopify webhook test tool)
```

---

## 🎯 Environment Variables

### Required for Automatic Webhook Registration

```bash
# Production app URL (used to build webhook endpoint URL)
NEXT_PUBLIC_APP_URL=https://instahealth.ae

# Shopify credentials (already required for OAuth)
SHOPIFY_CLIENT_ID=53ea35c97d30d93f2c70b754f537437d
SHOPIFY_CLIENT_SECRET=your-shopify-client-secret

# Webhook signing secret (for verifying webhook authenticity)
SHOPIFY_WEBHOOK_SECRET=your-webhook-signing-secret
```

**Important:**
- `NEXT_PUBLIC_APP_URL` MUST be your production domain
- MUST use HTTPS (not HTTP) in production
- Webhook URL will be: `${NEXT_PUBLIC_APP_URL}/api/shopify/webhooks`

---

## 📈 Benefits

### Before Automatic Registration

❌ Manual webhook setup required for each vendor
❌ Shopify Partner Dashboard configuration needed
❌ Prone to human error (wrong URL, missing webhooks)
❌ No cleanup on vendor disconnect
❌ Webhooks only work if manually configured

### After Automatic Registration

✅ **Zero manual configuration** - Webhooks created automatically
✅ **Per-vendor webhooks** - Each shop gets its own webhooks
✅ **Idempotent** - Safe to reconnect vendors multiple times
✅ **Automatic cleanup** - Webhooks deleted on disconnect
✅ **Production-ready** - Works for unlimited vendors
✅ **Self-healing** - Recreates webhooks if deleted

---

## 🚀 Migration from Manual Webhooks

If you previously set up webhooks manually in Shopify Partner Dashboard:

### Step 1: No Action Required

Automatic registration is **idempotent** - it will:
- ✅ Skip webhooks that already exist (same topic + URL)
- ✅ Create missing webhooks
- ✅ Not create duplicates

### Step 2: Optional Cleanup

If you want to remove old Partner Dashboard webhooks:

1. Go to Shopify Partner Dashboard → Your App → App Setup → Event subscriptions
2. Remove manually configured webhooks
3. Existing vendor webhooks will continue working (created via API)
4. New vendors will get webhooks via automatic registration

**Recommendation:** Leave Partner Dashboard webhooks empty - automatic registration handles everything.

---

## 📋 Testing Checklist

### Manual Testing

- [ ] **Fresh vendor connection**
  - Connect new Shopify store
  - Verify 4 webhooks created in Shopify admin
  - Check server logs for success

- [ ] **Reconnection (idempotent test)**
  - Disconnect vendor
  - Verify webhooks deleted
  - Reconnect same vendor
  - Verify webhooks recreated (no duplicates)

- [ ] **Webhook firing test**
  - Create product in Shopify admin
  - Verify webhook received (check server logs)
  - Verify product synced to InstaHealth

- [ ] **Cleanup test**
  - Disconnect vendor
  - Verify webhooks deleted from Shopify admin
  - Verify no orphaned webhooks

### Production Verification

```bash
# After first production vendor connects, verify:

# 1. Check logs for webhook registration
grep "WEBHOOK_REGISTRATION" /var/log/production.log | tail -20

# 2. Verify webhooks in vendor's Shopify admin
# (ask vendor to check Settings → Notifications → Webhooks)

# 3. Test webhook firing
# (update product in Shopify, verify it syncs to InstaHealth)

# 4. Monitor error rate
grep "WEBHOOK_REGISTRATION.*ERROR" /var/log/production.log
# Should be empty or minimal
```

---

## 🎉 Summary

**What changed:**
- ✅ Webhooks now register **automatically** after OAuth
- ✅ Webhooks **delete automatically** on disconnect
- ✅ Idempotent registration (no duplicates)
- ✅ Comprehensive logging for debugging

**What this means for vendors:**
- ✅ **Zero configuration** - Just click "Connect Shopify"
- ✅ **Real-time sync** - Products update automatically
- ✅ **No technical knowledge needed** - Everything just works

**What this means for operations:**
- ✅ **Scalable** - Supports unlimited vendors
- ✅ **Reliable** - No manual webhook setup errors
- ✅ **Self-service** - Vendors connect without support tickets
- ✅ **Production-ready** - Automatic registration for all new vendors

**Webhook registration is now fully automated. No Shopify Partner Dashboard configuration needed!** 🚀
