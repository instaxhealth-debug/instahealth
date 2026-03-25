# Shopify App Deployment Checklist

**Project:** InstaHealth Marketplace
**Deployment Target:** Vercel (instahealth.ae)
**Date:** 2026-03-25

---

## ✅ Pre-Deployment Checklist

### 1. Environment Variables (Vercel Dashboard)

**CRITICAL:** These must be set in Vercel before deployment

```bash
# Shopify App Credentials
SHOPIFY_CLIENT_ID="your_actual_client_id"
SHOPIFY_CLIENT_SECRET="shpcs_your_actual_secret"

# App URLs (MUST match production domain)
NEXT_PUBLIC_APP_URL="https://instahealth.ae"
NEXTAUTH_URL="https://instahealth.ae"

# Database
DATABASE_URL="postgresql://..." (from Neon/Supabase)
DIRECT_URL="postgresql://..." (direct connection)

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret"

# Other required vars (Stripe, SendGrid, etc.)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
SENDGRID_API_KEY="SG..."
# ... (add all other env vars from .env.local)
```

**How to verify in Vercel:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Ensure all variables are set for **Production** environment
3. Click "Redeploy" after adding/updating variables

---

### 2. Shopify Partner Dashboard Configuration

**Location:** https://partners.shopify.com/YOUR_ORG/apps/YOUR_APP_ID

#### App Setup Tab

**App URL:**
```
https://instahealth.ae/shopify
```

**Allowed redirection URLs (ADD BOTH):**
```
https://instahealth.ae/api/shopify/callback
https://instahealth.ae/admin/oauth/redirect_to_install
```

⚠️ **CRITICAL:** The `/admin/oauth/redirect_to_install` URL is NEW and REQUIRED for automated checks to pass.

#### API Credentials Tab

**Scopes:**
- `read_products`
- `read_inventory`
- `read_orders`

Copy the following to Vercel environment variables:
- **Client ID** → `SHOPIFY_CLIENT_ID`
- **Client Secret** → `SHOPIFY_CLIENT_SECRET`

#### Webhooks Tab

**Mandatory Compliance Webhooks** (configured in `shopify.app.toml`):

| Topic | URL | Status |
|-------|-----|--------|
| `customers/data_request` | `https://instahealth.ae/api/shopify/compliance` | ✅ Required |
| `customers/redact` | `https://instahealth.ae/api/shopify/compliance` | ✅ Required |
| `shop/redact` | `https://instahealth.ae/api/shopify/compliance` | ✅ Required |

These will auto-register when you deploy the app with the updated `shopify.app.toml`.

---

### 3. Code Changes to Deploy

**Files Modified:**
- ✅ `app/admin/oauth/redirect_to_install/route.ts` (NEW - handles install redirect)
- ✅ `shopify.app.toml` (UPDATED - fixed webhook config)
- ✅ `app/shopify/page.tsx` (UPDATED - handles install flow)
- ✅ `.env.shopify.production.example` (UPDATED - documentation)

**Git Commands:**
```bash
# Stage all changes
git add app/admin/oauth/redirect_to_install/route.ts
git add shopify.app.toml
git add app/shopify/page.tsx
git add .env.shopify.production.example
git add docs/SHOPIFY_APP_STORE_FIXES.md
git add docs/DEPLOYMENT_CHECKLIST.md

# Commit
git commit -m "fix: resolve Shopify App Store automated check failures

- Add /admin/oauth/redirect_to_install endpoint for install flow (returns 200)
- Fix compliance webhook configuration in shopify.app.toml (split into 3 subscriptions)
- Update /shopify page to handle install flow gracefully
- Add redirect URL to auth configuration
- All HMAC webhook verification already implemented correctly

Fixes:
- Navigation error on install (404 → 200 redirect)
- Mandatory compliance webhooks configuration
- Webhook HMAC signature verification (already working)

Closes #ISSUE_NUMBER"

# Push to main (or your deployment branch)
git push origin main
```

---

### 4. Vercel Deployment

**Automatic Deployment:**
- Vercel will automatically deploy when you push to `main` branch
- Watch the deployment logs in Vercel Dashboard

**Manual Deployment (if needed):**
```bash
vercel --prod
```

**Build Command (configured in `vercel.json`):**
```bash
npx prisma generate && npm run build
```

This will:
1. Generate Prisma client
2. Run guardrails check
3. Build Next.js app

---

### 5. Post-Deployment Verification

**Test these URLs manually:**

#### 5.1 OAuth Install Redirect (NEW ENDPOINT)
```bash
# Should redirect to /shopify (not 404)
curl -I "https://instahealth.ae/admin/oauth/redirect_to_install?client_id=YOUR_CLIENT_ID&shop=test.myshopify.com"

# Expected: HTTP/2 302 (redirect)
# Location: https://instahealth.ae/shopify?install=true&shop=test.myshopify.com
```

#### 5.2 App Home Page
```bash
# Should return 200 OK with HTML
curl -I "https://instahealth.ae/shopify"

# Expected: HTTP/2 200
```

#### 5.3 Compliance Webhook Endpoint
```bash
# Should return 401 (missing HMAC)
curl -I "https://instahealth.ae/api/shopify/compliance"

# Expected: HTTP/2 401 (Unauthorized - missing HMAC)
```

#### 5.4 OAuth Callback
```bash
# Should redirect or return error (when accessed without valid params)
curl -I "https://instahealth.ae/api/shopify/callback"

# Expected: HTTP/2 302 or 400 (redirect to error)
```

---

### 6. Shopify Automated Checks

**Run in Shopify Partner Dashboard:**

1. Go to your app → **Test on development store**
2. Click **Run automated checks**
3. Verify all checks pass:

| Check | Status |
|-------|--------|
| Immediately authenticates after install | ✅ Should pass |
| Immediately redirects to app UI after authentication | ✅ Should pass (NEW FIX) |
| Provides mandatory compliance webhooks | ✅ Should pass (NEW FIX) |
| Verifies webhooks with HMAC signatures | ✅ Should pass (already working) |
| Uses valid TLS certificate | ✅ Should pass (instahealth.ae has valid cert) |

---

### 7. Test Install Flow on Development Store

**Full OAuth Flow Test:**

1. Install app on a Shopify development store
2. Monitor logs in Vercel Dashboard → Functions
3. Expected flow:
   ```
   GET /admin/oauth/redirect_to_install
   → 302 redirect to /shopify?install=true

   User clicks "Connect Shopify"
   → POST /api/shopify/connect
   → Redirects to Shopify OAuth

   User approves
   → GET /api/shopify/callback?code=...
   → Exchanges code for token
   → Registers webhooks
   → 302 redirect to /shopify?shopify=connected

   Success! Shows "Successfully Connected!"
   ```

4. Verify webhooks registered:
   - Go to Shopify Partner Dashboard → Webhooks
   - Should see 3 compliance webhooks registered

---

### 8. Test Compliance Webhooks

**Send test webhooks from Shopify Partner Dashboard:**

#### 8.1 customers/data_request
```bash
# In Shopify Partner Dashboard → Webhooks → Send test webhook
Topic: customers/data_request
URL: https://instahealth.ae/api/shopify/compliance

# Expected Response: 200 OK
# Expected in logs: "Customer data request acknowledged"
```

#### 8.2 customers/redact
```bash
Topic: customers/redact
URL: https://instahealth.ae/api/shopify/compliance

# Expected Response: 200 OK
# Expected in logs: "Customer redaction acknowledged"
```

#### 8.3 shop/redact
```bash
Topic: shop/redact
URL: https://instahealth.ae/api/shopify/compliance

# Expected Response: 200 OK
# Expected in logs: "Shop data redacted successfully"
```

#### 8.4 Invalid HMAC Test
```bash
# Send webhook with invalid HMAC signature
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "X-Shopify-Topic: customers/data_request" \
  -H "X-Shopify-Hmac-Sha256: invalid_signature" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "Content-Type: application/json" \
  -d '{"shop_id": 123}'

# Expected Response: 401 Unauthorized
# Expected body: {"error": "Unauthorized - invalid signature"}
```

---

### 9. Monitor Production Logs

**Vercel Functions Logs:**
```
Vercel Dashboard → Functions → Real-time Logs
```

**Key logs to watch for:**
- `[REDIRECT_TO_INSTALL]` - Install redirect logs
- `[SHOPIFY_CALLBACK]` - OAuth callback logs
- `[SHOPIFY_COMPLIANCE]` - GDPR webhook logs
- `[WEBHOOK_VERIFY]` - HMAC verification logs

---

### 10. Final Pre-Submission Checklist

Before submitting to Shopify App Store:

- [ ] All environment variables set in Vercel
- [ ] Code deployed to production (instahealth.ae)
- [ ] Shopify Partner Dashboard URLs updated (especially `/admin/oauth/redirect_to_install`)
- [ ] Automated checks all pass ✅
- [ ] Test install on development store works
- [ ] All 3 compliance webhooks respond with 200
- [ ] Invalid HMAC returns 401
- [ ] App home page (`/shopify`) returns 200
- [ ] Privacy policy exists at `https://instahealth.ae/privacy`
- [ ] Terms of service exists at `https://instahealth.ae/terms`
- [ ] Support email configured: `info@instahealth.ae`
- [ ] App icon uploaded (1024x1024 PNG)
- [ ] Screenshots uploaded (1600x1200 recommended)
- [ ] App listing description complete
- [ ] Pricing plan configured (if applicable)

---

## 🚨 Troubleshooting

### Issue: Automated checks still failing

**Solution:**
1. Clear Vercel build cache: `Vercel Dashboard → Deployments → ... → Redeploy (Clear Cache)`
2. Verify environment variables are set in Production (not Preview)
3. Check Vercel function logs for errors
4. Verify Shopify Partner Dashboard URLs exactly match production

### Issue: Webhooks not registering

**Solution:**
1. Check `shopify.app.toml` is deployed (not in `.gitignore`)
2. Verify `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` are correct
3. Manually trigger webhook registration: Install app again on test store
4. Check logs in `/api/shopify/callback` for webhook registration errors

### Issue: 401 on valid webhooks

**Solution:**
1. Verify `SHOPIFY_CLIENT_SECRET` matches value in Partner Dashboard
2. Check that endpoint is reading raw body (not parsed JSON) before verification
3. Test with Shopify's test webhook feature (uses real HMAC)

---

## 📚 References

- [Shopify App Store Requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/requirements)
- [Privacy & GDPR Compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- [Webhook HMAC Verification](https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook)
- [OAuth Flow](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)

---

**Last Updated:** 2026-03-25
**Next Review:** After first production deployment
