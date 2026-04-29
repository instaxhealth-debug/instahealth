# SHOPIFY APP STORE DEPLOYMENT CHECKLIST

**After pushing commit 1347303**

---

## ✅ COMPLETED (Automated)

1. ✅ Fixed `application_url` in shopify.app.toml
2. ✅ Fixed App Bridge redirect action in OAuth callback
3. ✅ Added `/api/shopify/install` to redirect_urls
4. ✅ Code committed and pushed to main branch
5. ✅ Vercel deployment triggered (automatic on git push)

---

## ⚠️ MANUAL ACTIONS REQUIRED

### STEP 1: Deploy Shopify Configuration (CRITICAL)

The `shopify.app.toml` file has been updated but **NOT deployed** to Partner Dashboard yet.

```bash
# Install Shopify CLI (if not already installed)
npm install -g @shopify/cli @shopify/app

# Authenticate with your Shopify Partner account
shopify auth logout  # Clear old sessions first
shopify auth login   # Follow browser authentication

# Deploy app configuration (syncs shopify.app.toml to Partner Dashboard)
cd /Users/cruzfrangieh/Desktop/instaxhealth\ website
shopify app deploy
```

**Expected output:**
```
✓ Deploying to Shopify...
✓ Deployed app configuration
✓ App URL: https://instahealth.ae
✓ Webhooks configured: 3 privacy compliance webhooks
```

**If `shopify app deploy` fails:**
- Manually configure in Partner Dashboard (see Step 2)

---

### STEP 2: Verify Partner Dashboard Configuration

Go to: https://partners.shopify.com → Your Apps → InstaHealth Marketplace

#### 2A. Configuration → URLs
- **App URL**: Should show `https://instahealth.ae` (not `/shopify`)
- **Allowed redirection URL(s)**:
  - ✅ `https://instahealth.ae/api/shopify/callback`
  - ✅ `https://instahealth.ae/api/shopify/install`
  - ✅ `https://instahealth.ae/admin/oauth/redirect_to_install`

#### 2B. Configuration → Webhooks
Should show 3 GDPR webhooks:
- ✅ **Customer data request**: `https://instahealth.ae/api/shopify/compliance`
- ✅ **Customer data erasure**: `https://instahealth.ae/api/shopify/compliance`
- ✅ **Shop data erasure**: `https://instahealth.ae/api/shopify/compliance`

**If webhooks are missing:**
1. Click "Add webhook"
2. Select "Privacy compliance" category
3. Add each of the 3 URLs above

#### 2C. Configuration → App capabilities
Current capabilities selected:
- ✅ **Embedded app**: KEEP (required)
- ⚠️ **Connector**: KEEP (optional - product sync to external system)
- ❌ **Sales channel**: REMOVE (InstaHealth is not a Shopify sales channel)

**To remove Sales Channel:**
1. Configuration → App setup
2. Distribution → Sales channels
3. Uncheck "Sales channel"
4. Save changes

---

### STEP 3: Test Live Compliance Endpoint

Test that HMAC verification is working correctly:

```bash
# Test 1: Missing HMAC (should return 401)
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "Content-Type: application/json" \
  -d '{"shop_id":123,"shop_domain":"test.myshopify.com"}'

# Expected response:
# {"error":"Unauthorized - missing authentication headers"}
# Status: 401

# Test 2: Invalid HMAC (should return 401)
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: invalid_hmac" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Topic: customers/data_request" \
  -d '{"shop_id":123}'

# Expected response:
# {"error":"Unauthorized - invalid signature"}
# Status: 401
```

**If tests fail:**
- Check Vercel deployment logs
- Verify `SHOPIFY_CLIENT_SECRET` environment variable is set in Vercel
- Check that route is deployed (Vercel → Functions → compliance)

---

### STEP 4: Test Install Flow (Optional but Recommended)

Create a development store and test the full install flow:

1. Go to Partner Dashboard → Development stores → Create store
2. Add 5-10 test products with variants and images
3. Install your app from Partner Dashboard (or use install URL)
4. Verify:
   - ✅ OAuth completes without 404 error
   - ✅ Redirects to embedded app successfully
   - ✅ Products sync to InstaHealth
   - ✅ No errors in Vercel logs

**Install URL format:**
```
https://instahealth.ae/api/shopify/install?shop=your-dev-store.myshopify.com
```

---

### STEP 5: Re-run Shopify Automated Checks

After completing steps 1-4:

1. Go to Partner Dashboard → Your App → Distribution
2. Scroll to "App Store listing"
3. Click "Run automated checks" (or equivalent)
4. Wait for results

**Expected results:**
- ✅ Navigation: 200 OK (not 404)
- ✅ Compliance webhooks: Configured
- ✅ HMAC verification: Working

---

## 🔍 VERIFICATION CHECKLIST

Before submitting for review, verify ALL of these:

### Configuration Files
- [ ] `shopify.app.toml` shows `application_url = "https://instahealth.ae"`
- [ ] `shopify.app.toml` includes `/api/shopify/install` in redirect_urls
- [ ] Latest commit (1347303) is deployed to Vercel
- [ ] Vercel build completed successfully

### Partner Dashboard
- [ ] App URL: `https://instahealth.ae`
- [ ] 3 GDPR webhooks configured
- [ ] OAuth redirect URLs match TOML file
- [ ] "Sales Channel" capability removed
- [ ] "Embedded app" capability enabled

### Live Testing
- [ ] Compliance endpoint returns 401 on missing HMAC
- [ ] Compliance endpoint returns 401 on invalid HMAC
- [ ] Install flow completes without 404 error
- [ ] App loads in Shopify admin iframe

### Environment Variables (Vercel)
- [ ] `SHOPIFY_CLIENT_ID` set
- [ ] `SHOPIFY_CLIENT_SECRET` set
- [ ] `NEXT_PUBLIC_SHOPIFY_CLIENT_ID` set
- [ ] `DATABASE_URL` set

---

## 🚨 IF AUTOMATED CHECKS STILL FAIL

Run these diagnostic commands:

```bash
# 1. Verify application_url in deployed TOML
curl -s https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/shopify.app.toml | grep application_url

# 2. Test OAuth callback returns 200
curl -I "https://instahealth.ae/api/shopify/callback?code=test&shop=test.myshopify.com&state=test"

# 3. Check Vercel deployment status
vercel ls

# 4. Check Vercel environment variables
vercel env ls
```

**Then:**
1. Check SHOPIFY_LIVE_FAILURE_FORENSICS.md for detailed root cause analysis
2. Review Vercel deployment logs for errors
3. Check Shopify Partner Dashboard audit log
4. Contact Shopify Partner Support if configuration issues persist

---

## 📞 SUPPORT

If you need help:
- **Shopify Partner Support**: https://partners.shopify.com/support
- **Deployment issues**: Check Vercel logs and Shopify audit log
- **HMAC verification**: Verify SHOPIFY_CLIENT_SECRET matches Partner Dashboard

---

**Last Updated**: 2026-04-01
**Commit**: 1347303
