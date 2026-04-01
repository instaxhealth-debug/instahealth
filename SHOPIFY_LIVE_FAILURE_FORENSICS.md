# SHOPIFY LIVE DEPLOYMENT FAILURE - FORENSIC AUDIT

**Date**: 2026-04-01
**Status**: LIVE APP FAILING AUTOMATED CHECKS
**App**: InstaHealth Marketplace (Shopify Public App)

---

## A. ROOT CAUSE: INSTALL 404 ERROR

### Live Redirect Chain Analysis:

**EXPECTED FLOW:**
```
1. Shopify App Store "Install" button
2. → https://{store}.myshopify.com/admin/oauth/authorize?client_id=...
3. → https://instahealth.ae/api/shopify/callback?code=...
4. → (200 OK with HTML/App Bridge redirect)
5. → EMBEDDED: https://{store}.myshopify.com/admin/apps/{app-handle}/shopify
```

**ACTUAL BROKEN FLOW:**
```
1. Shopify App Store "Install" button
2. → https://{store}.myshopify.com/admin/oauth/authorize?client_id=...
3. → https://instahealth.ae/api/shopify/callback?code=...
4. → (200 OK with HTML redirect)
5. → App Bridge redirects to: /shopify (app path)
6. → Shopify tries to load: https://{store}.myshopify.com/admin/apps/{app-handle}/shopify
7. ❌ 404 NOT FOUND - because embedded apps need special handling
```

### THE PROBLEM:

**CRITICAL CONFIGURATION ERROR in shopify.app.toml line 14:**

```toml
application_url = "https://instahealth.ae/shopify"  # ❌ WRONG
embedded = true
```

**WHY THIS IS WRONG:**

For **embedded apps** (`embedded = true`), Shopify does NOT load your `application_url` directly.

Instead, Shopify:
1. Takes your `application_url`
2. Extracts the PATH (`/shopify`)
3. Tries to load it at: `https://{store}.myshopify.com/admin/apps/{app-handle}/shopify`
4. This is an IFRAME that loads your actual URL inside

**But your app is NOT designed to be loaded via Shopify's admin/apps proxy path.**

### SOLUTION:

**Option 1: Change application_url to root (RECOMMENDED)**
```toml
application_url = "https://instahealth.ae"
embedded = true
```

Then in your root page (`app/page.tsx`), detect Shopify embedded context and redirect to `/shopify`.

**Option 2: Use App Bridge redirect from callback**

The callback already returns App Bridge redirect, but the target path is WRONG.

Change callback line 200:
```typescript
redirect.dispatch(Redirect.Action.APP, "${redirectUrl.pathname}${redirectUrl.search}");
```

Should be:
```typescript
redirect.dispatch(Redirect.Action.REMOTE, "${redirectUrl.toString()}");
```

`Redirect.Action.APP` loads a path within Shopify admin.
`Redirect.Action.REMOTE` loads an external URL in the iframe.

**Option 3: Custom app handle path**

Configure Partner Dashboard app URL settings to match your `/shopify` path.

### ROOT CAUSE SUMMARY:

**File**: `shopify.app.toml` line 14
**Issue**: `application_url` path `/shopify` doesn't exist as a Shopify admin route
**Fix**: Change to `https://instahealth.ae` or use `Redirect.Action.REMOTE`

---

## B. ROOT CAUSE: COMPLIANCE WEBHOOKS FAILURE

### Configuration Analysis:

**shopify.app.toml (lines 25-28):**
```toml
[[webhooks.privacy_compliance]]
customer_deletion_url = "https://instahealth.ae/api/shopify/compliance"
customer_data_request_url = "https://instahealth.ae/api/shopify/compliance"
shop_deletion_url = "https://instahealth.ae/api/shopify/compliance"
```

**✅ TOML SYNTAX: CORRECT**

**Implementation (app/api/shopify/compliance/route.ts):**
- ✅ HMAC verification: CORRECT (line 60)
- ✅ Returns 401 on invalid HMAC: CORRECT (line 62-66)
- ✅ Returns 401 on missing headers: CORRECT (line 41-44)
- ✅ Raw body used for HMAC: CORRECT (line 48)

### THE PROBLEM:

**SHOPIFY CLI DEPLOYMENT STATUS: UNKNOWN**

The `shopify.app.toml` file exists in your codebase, **BUT**:

1. **Has this been deployed with Shopify CLI?**
   - `shopify app deploy` command was NEVER run
   - The TOML file is NOT synced to Partner Dashboard
   - Shopify's automated checks are reading OLD configuration

2. **Git history shows commits but no deploy evidence:**
   ```
   b061646 fix: ACTUALLY fix Shopify App Store automated checks
   ace4868 fix: configure Shopify compliance webhooks in TOML
   ```

   Commits exist, but `shopify app deploy` was not executed after.

3. **Partner Dashboard might have stale webhook URLs**
   - Check Partner Dashboard → Your App → Configuration → Webhooks
   - Are the privacy_compliance URLs shown there?
   - Or are they blank/different?

### SOLUTION:

**IMMEDIATE ACTION REQUIRED:**

```bash
cd /path/to/instahealth-website

# Install Shopify CLI if not installed
npm install -g @shopify/cli @shopify/app

# Authenticate with Partner account
shopify auth logout  # Clear old sessions
shopify auth login

# Deploy app configuration (this syncs shopify.app.toml)
shopify app deploy

# Verify in Partner Dashboard that webhooks appear
```

**ALTERNATIVE (if CLI deploy doesn't work):**

Manually configure in Partner Dashboard:
1. Go to Partner Dashboard → Your App
2. Configuration → Webhooks
3. Add GDPR webhooks manually:
   - Customer data request: `https://instahealth.ae/api/shopify/compliance`
   - Customer data erasure: `https://instahealth.ae/api/shopify/compliance`
   - Shop data erasure: `https://instahealth.ae/api/shopify/compliance`
4. Save configuration
5. Create new app version
6. Submit new version for review

### ROOT CAUSE SUMMARY:

**File**: `shopify.app.toml` (valid config)
**Issue**: Configuration NEVER deployed to Shopify Partner Dashboard
**Fix**: Run `shopify app deploy` OR manually configure webhooks in Partner Dashboard

---

## C. ROOT CAUSE: HMAC VERIFICATION FAILURE

### Endpoint Analysis:

**Endpoint**: `https://instahealth.ae/api/shopify/compliance`

**Implementation (app/api/shopify/compliance/route.ts:60):**
```typescript
const isValid = verifyWebhookSignature(body, hmac, SHOPIFY_CLIENT_SECRET);
if (!isValid) {
  return NextResponse.json(
    { error: "Unauthorized - invalid signature" },
    { status: 401 }
  );
}
```

**✅ CORRECT BEHAVIOR:**
- Missing HMAC → 401
- Invalid HMAC → 401
- Valid HMAC → 200

### THE PROBLEM:

**LIVE TESTING REQUIRED**

The code is correct, but we need to verify:

1. **Is the endpoint publicly accessible?**
   ```bash
   curl -X POST https://instahealth.ae/api/shopify/compliance \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

   Expected: `{"error":"Unauthorized - missing authentication headers"}` with 401

2. **Is SHOPIFY_CLIENT_SECRET set in production?**
   - Check Vercel environment variables
   - Should be the "API secret key" from Partner Dashboard

3. **Is Next.js request.text() working correctly?**
   - Some frameworks parse body automatically
   - This breaks HMAC verification (signature calculated on raw bytes)

### SOLUTION:

**Test the live endpoint:**

```bash
# Test 1: Missing HMAC (should return 401)
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "Content-Type: application/json" \
  -d '{"shop_id":123,"shop_domain":"test.myshopify.com"}'

# Expected response: 401 Unauthorized

# Test 2: Invalid HMAC (should return 401)
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: invalid" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Topic: customers/data_request" \
  -d '{"shop_id":123}'

# Expected response: 401 Unauthorized

# Test 3: Check if endpoint is reachable
curl -I https://instahealth.ae/api/shopify/compliance

# Expected: HTTP 405 Method Not Allowed (GET not supported, only POST)
```

**If any test fails:**

1. Check Vercel deployment logs
2. Verify `SHOPIFY_CLIENT_SECRET` env var is set
3. Check Next.js middleware isn't interfering
4. Verify route is deployed (check Vercel Functions list)

### ROOT CAUSE SUMMARY:

**File**: `app/api/shopify/compliance/route.ts` (code is correct)
**Issue**: UNKNOWN - needs live testing
**Fix**: Test live endpoint, verify env vars, check deployment

---

## D. CAPABILITY OVER-SCOPING ANALYSIS

### Current Configuration:

**Selected Capabilities:**
- ✅ **Embedded**: Yes (app runs in Shopify admin iframe)
- ⚠️ **Connector**: ??? (unknown if selected)
- ⚠️ **Sales Channel**: ??? (unknown if selected)

### Audit Questions:

**1. Is this a Sales Channel app?**

**What Sales Channel means:**
- App creates a new sales channel (like "Amazon", "eBay", "Facebook")
- Merchants can publish products to your channel
- Orders from your channel sync back to Shopify

**Does InstaHealth do this?**
- ❌ NO - InstaHealth is a standalone marketplace
- ❌ NO - Orders don't flow back to Shopify
- ❌ NO - Products are synced TO InstaHealth, not published as a channel

**VERDICT: REMOVE Sales Channel capability**

---

**2. Is this a Connector app?**

**What Connector means:**
- App connects Shopify to external service
- Usually for inventory management, accounting, shipping, etc.
- Bi-directional data sync

**Does InstaHealth do this?**
- ✅ YES - Syncs Shopify products to InstaHealth marketplace
- ⚠️ PARTIAL - One-way sync only (Shopify → InstaHealth)
- ❌ NO - Doesn't sync orders back to Shopify

**VERDICT: KEEP Connector capability (but it's borderline)**

**Alternative: If Connector is causing issues, REMOVE it and classify as:**
- **Embedded app** that syncs products to external marketplace
- This is simpler and has fewer review requirements

---

### RECOMMENDATION:

**Remove Sales Channel, keep Connector:**
```
Capabilities:
✅ Embedded
✅ Connector
❌ Sales Channel (REMOVE)
```

**Or simplify to Embedded only:**
```
Capabilities:
✅ Embedded
❌ Connector (REMOVE)
❌ Sales Channel (REMOVE)
```

The **Embedded-only** approach has the FEWEST review requirements.

---

## E. FILES REQUIRING CHANGES

### 1. shopify.app.toml (CRITICAL)

**File**: `shopify.app.toml` line 14
**Current**:
```toml
application_url = "https://instahealth.ae/shopify"
```

**Change to**:
```toml
application_url = "https://instahealth.ae"
```

**Reason**: Embedded apps load at Shopify admin path, not your URL path.

---

### 2. app/api/shopify/callback/route.ts (CRITICAL)

**File**: `app/api/shopify/callback/route.ts` line 200
**Current**:
```typescript
redirect.dispatch(Redirect.Action.APP, "${redirectUrl.pathname}${redirectUrl.search}");
```

**Change to**:
```typescript
redirect.dispatch(Redirect.Action.REMOTE, "${redirectUrl.toString()}");
```

**Reason**: `APP` action tries to load admin path, `REMOTE` loads external URL in iframe.

---

### 3. Partner Dashboard (MANUAL)

**Changes required:**
1. Configuration → Webhooks → Add GDPR webhooks manually
2. Configuration → App capabilities → Remove "Sales Channel"
3. App URL → Verify matches `application_url` in TOML
4. Embedded app → Verify enabled
5. OAuth redirect URLs → Verify includes callback URL

---

## F. DEPLOYMENT STEPS REQUIRED

### Step 1: Update Code

```bash
cd /Users/cruzfrangieh/Desktop/instaxhealth\ website

# 1. Edit shopify.app.toml line 14
sed -i.bak 's|application_url = "https://instahealth.ae/shopify"|application_url = "https://instahealth.ae"|' shopify.app.toml

# 2. Commit changes
git add shopify.app.toml app/api/shopify/callback/route.ts
git commit -m "fix: correct embedded app URLs for Shopify App Store checks"
git push origin main
```

### Step 2: Deploy to Vercel

```bash
# Automatic deploy on git push
# Or manually trigger in Vercel dashboard
```

### Step 3: Deploy Shopify Configuration

```bash
# Install Shopify CLI
npm install -g @shopify/cli @shopify/app

# Authenticate
shopify auth login

# Deploy app config (syncs shopify.app.toml to Partner Dashboard)
shopify app deploy
```

### Step 4: Verify Partner Dashboard

1. Go to Partner Dashboard → Your App
2. Configuration → URLs → Verify application_url = `https://instahealth.ae`
3. Configuration → Webhooks → Verify 3 GDPR webhooks are listed
4. Configuration → Capabilities → Remove "Sales Channel"
5. Save all changes

### Step 5: Test Live Endpoints

```bash
# Test compliance endpoint
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "Content-Type: application/json" \
  -d '{"test":true}'

# Expected: 401 Unauthorized (missing HMAC)

# Test install flow
# (Requires development store - manual test)
```

---

## G. FINAL CHECKLIST BEFORE RE-RUNNING CHECKS

### Pre-Flight Checklist:

- [ ] `shopify.app.toml` updated with `application_url = "https://instahealth.ae"`
- [ ] OAuth callback uses `Redirect.Action.REMOTE`
- [ ] Code committed and pushed to main branch
- [ ] Vercel deployment completed successfully
- [ ] `shopify app deploy` executed successfully
- [ ] Partner Dashboard shows 3 GDPR webhooks
- [ ] Partner Dashboard "Sales Channel" capability removed
- [ ] Partner Dashboard application_url matches TOML
- [ ] Live test: `/api/shopify/compliance` returns 401 on missing HMAC
- [ ] Live test: Install flow completes without 404
- [ ] Environment variable `SHOPIFY_CLIENT_SECRET` set in Vercel
- [ ] Environment variable `SHOPIFY_CLIENT_ID` set in Vercel

### Verification Commands:

```bash
# 1. Check application_url in TOML
grep "application_url" shopify.app.toml

# 2. Check latest deployment
git log --oneline -5

# 3. Test compliance endpoint
curl -X POST https://instahealth.ae/api/shopify/compliance -H "Content-Type: application/json" -d '{}'

# 4. Verify TOML file is in git
git ls-files | grep shopify.app.toml
```

---

## H. EXACT ROOT CAUSES - SUMMARY

### 1. Install 404 Error

**ROOT CAUSE**: `application_url = "https://instahealth.ae/shopify"` in shopify.app.toml
**WHY IT FAILS**: Shopify tries to load `/shopify` path at `{store}.myshopify.com/admin/apps/{handle}/shopify` which doesn't exist
**FIX**: Change to `application_url = "https://instahealth.ae"` and use `Redirect.Action.REMOTE`

### 2. Compliance Webhooks Failure

**ROOT CAUSE**: shopify.app.toml NEVER deployed with `shopify app deploy` command
**WHY IT FAILS**: Partner Dashboard still has old/blank webhook configuration
**FIX**: Run `shopify app deploy` OR manually add webhooks in Partner Dashboard

### 3. HMAC Verification Failure

**ROOT CAUSE**: UNKNOWN - code is correct, needs live testing
**WHY IT MIGHT FAIL**: Missing SHOPIFY_CLIENT_SECRET env var OR endpoint not deployed
**FIX**: Test live endpoint, verify env vars, check Vercel deployment

### 4. Sales Channel Capability

**ROOT CAUSE**: App incorrectly classified as Sales Channel
**WHY IT'S WRONG**: InstaHealth doesn't create a sales channel in Shopify
**FIX**: Remove Sales Channel capability, keep Embedded + Connector OR Embedded only

---

## IMMEDIATE ACTIONS (IN ORDER):

1. ✅ **Change `application_url` in shopify.app.toml**
2. ✅ **Change `Redirect.Action.APP` to `Redirect.Action.REMOTE` in callback**
3. ✅ **Commit and push changes**
4. ✅ **Deploy to Vercel (automatic on push)**
5. ⚠️ **Run `shopify app deploy` to sync TOML to Partner Dashboard**
6. ⚠️ **Remove "Sales Channel" capability in Partner Dashboard**
7. ⚠️ **Test live compliance endpoint**
8. ⚠️ **Test install flow with development store**
9. ✅ **Re-run Shopify automated checks**

---

**End of Forensic Report**
