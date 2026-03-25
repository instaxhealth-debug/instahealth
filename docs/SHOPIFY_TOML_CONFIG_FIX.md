# SHOPIFY APP CONFIGURATION FIX - TOML & COMPLIANCE WEBHOOKS

## CRITICAL ISSUE IDENTIFIED

**ROOT CAUSE**: The app was missing `shopify.app.toml` configuration file entirely.

Shopify's automated checks require compliance webhooks to be **declared in app configuration** (`shopify.app.toml`), not just registered at runtime via API.

---

## A. EXACT CURRENT TOML ISSUE

### Problem
**`shopify.app.toml` DID NOT EXIST**

Shopify Partner automated checks look for:
1. Compliance webhook configuration in app metadata (TOML file)
2. Valid HMAC signature verification (must return 401 for invalid/missing HMAC)

Without `shopify.app.toml`:
- ❌ Shopify cannot detect compliance webhook configuration
- ❌ Automated check "Provides mandatory compliance webhooks" fails
- ❌ Automated check "Verifies webhooks with HMAC signatures" fails

### Why This Matters
From Shopify documentation:
> "Changes to the shopify.app.toml are applied automatically during app dev for your chosen development store. For app configuration changes to take effect for all stores in production, you need to run the deploy command."

Public apps MUST declare compliance webhooks in TOML for App Store approval.

---

## B. EXACT FILES CHANGED

### 1. **NEW FILE**: `shopify.app.toml` (ROOT DIRECTORY)
**Purpose**: Declare app configuration and mandatory compliance webhooks

**Configuration**:
```toml
[webhooks]
api_version = "2024-10"

[[webhooks.subscriptions]]
topics = ["customers/data_request", "customers/redact", "shop/redact"]
uri = "/api/shopify/compliance"
```

**Why Single Endpoint**:
- Shopify TOML format expects one `uri` per subscription block
- All 3 GDPR topics can share one endpoint
- Handler routes internally based on `X-Shopify-Topic` header
- Simpler configuration and maintenance

---

### 2. **NEW FILE**: `app/api/shopify/compliance/route.ts` (305 lines)
**Purpose**: Single compliance webhook handler for all 3 GDPR topics

**Key Features**:
- Routes to topic-specific handlers based on `X-Shopify-Topic` header
- Returns 401 for missing/invalid HMAC (not 400)
- Handles all 3 mandatory topics:
  - `customers/data_request` - Customer data access requests
  - `customers/redact` - Customer data deletion requests
  - `shop/redact` - Shop data deletion (48hrs after uninstall)

**HMAC Security**:
```typescript
// CRITICAL: Missing HMAC returns 401
if (!hmac || !shopDomain) {
  return NextResponse.json(
    { error: "Unauthorized - missing authentication headers" },
    { status: 401 }
  );
}

// Invalid HMAC returns 401
const isValid = verifyWebhookSignature(body, hmac, SHOPIFY_CLIENT_SECRET);
if (!isValid) {
  return NextResponse.json(
    { error: "Unauthorized - invalid signature" },
    { status: 401 }
  );
}
```

---

### 3. **MODIFIED**: `app/api/shopify/gdpr/customers-data-request/route.ts`
**Change**: Line 28-35 - Missing HMAC now returns 401 (was 400)

**Before**:
```typescript
if (!hmac || !shopDomain) {
  return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
}
```

**After**:
```typescript
if (!hmac || !shopDomain) {
  // CRITICAL: Missing HMAC must return 401 (not 400) per Shopify requirements
  return NextResponse.json(
    { error: "Unauthorized - missing authentication headers" },
    { status: 401 }
  );
}
```

---

### 4. **MODIFIED**: `app/api/shopify/gdpr/customers-redact/route.ts`
**Change**: Line 28-35 - Missing HMAC now returns 401 (was 400)

Same fix as above - changed status code from 400 to 401 for missing authentication headers.

---

### 5. **MODIFIED**: `app/api/shopify/gdpr/shop-redact/route.ts`
**Change**: Line 28-35 - Missing HMAC now returns 401 (was 400)

Same fix as above - changed status code from 400 to 401 for missing authentication headers.

---

### 6. **MODIFIED**: `app/api/shopify/webhooks/route.ts`
**Change**: Line 27-33 - Missing HMAC now returns 401 (was 400)

Product webhook handler also updated for consistency with Shopify security requirements.

---

## C. EXACT FINAL TOML BLOCK

**File**: `shopify.app.toml` (ROOT DIRECTORY)

```toml
# =============================================================================
# SHOPIFY PUBLIC APP CONFIGURATION
# =============================================================================

# App identification
name = "InstaHealth Marketplace"
client_id = ""  # Set via SHOPIFY_API_KEY environment variable
scopes = "read_products,read_inventory,read_orders"

# Application URLs
application_url = "https://instahealth.ae/shopify"
embedded = true

# =============================================================================
# MANDATORY COMPLIANCE WEBHOOKS
# =============================================================================

[webhooks]
api_version = "2024-10"

# Single compliance endpoint for all three mandatory GDPR webhooks
[[webhooks.subscriptions]]
topics = ["customers/data_request", "customers/redact", "shop/redact"]
uri = "/api/shopify/compliance"

# =============================================================================
# ACCESS SCOPES
# =============================================================================

[access_scopes]
scopes = "read_products,read_inventory,read_orders"

# =============================================================================
# AUTH CONFIGURATION
# =============================================================================

[auth]
redirect_urls = [
  "https://instahealth.ae/api/shopify/callback",
  "http://localhost:3000/api/shopify/callback"
]
```

---

## D. EXACT FINAL COMPLIANCE ENDPOINT(S)

### PRIMARY ENDPOINT (TOML-CONFIGURED)
**Route**: `/api/shopify/compliance`
**File**: `app/api/shopify/compliance/route.ts`
**Purpose**: Single handler for all 3 mandatory GDPR webhooks

**Topics Handled**:
1. `customers/data_request` → `handleCustomerDataRequest()`
2. `customers/redact` → `handleCustomerRedact()`
3. `shop/redact` → `handleShopRedact()`

**Why This Approach**:
- Shopify TOML format prefers single URI per subscription
- Cleaner configuration
- Single point of HMAC verification
- Routes internally by topic header
- Easier to test and maintain

---

### LEGACY ENDPOINTS (STILL FUNCTIONAL)
**Routes**:
- `/api/shopify/gdpr/customers-data-request`
- `/api/shopify/gdpr/customers-redact`
- `/api/shopify/gdpr/shop-redact`

**Status**: KEPT for backward compatibility
**Updated**: Now return 401 for missing HMAC (was 400)

**Decision**: Keep both endpoint structures
- TOML points to `/api/shopify/compliance` (new single endpoint)
- Legacy endpoints still work if manually subscribed
- Allows gradual migration if needed

---

## E. EXACT HMAC BEHAVIOR FOR INVALID SIGNATURE

### BEFORE FIX
**Problem**: Missing HMAC returned `400 Bad Request`

```typescript
if (!hmac || !shopDomain) {
  return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
}
```

### AFTER FIX
**Solution**: Missing or invalid HMAC returns `401 Unauthorized`

**Missing HMAC**:
```typescript
if (!hmac || !shopDomain) {
  return NextResponse.json(
    { error: "Unauthorized - missing authentication headers" },
    { status: 401 }
  );
}
```

**Invalid HMAC**:
```typescript
const isValid = verifyWebhookSignature(body, hmac, SHOPIFY_CLIENT_SECRET);
if (!isValid) {
  return NextResponse.json(
    { error: "Unauthorized - invalid signature" },
    { status: 401 }
  );
}
```

### Why 401 Not 400

**Shopify Documentation**:
> "If a mandatory compliance webhook sends a request with an invalid Shopify HMAC header, then the app must return a 401 Unauthorized HTTP status."

**Rationale**:
- 400 = Client sent malformed request (syntax error)
- 401 = Request lacks valid authentication (HMAC failed)
- HMAC is authentication, not validation
- Shopify automated checks specifically look for 401 response

---

## F. WHETHER YOU NEED TO CREATE/RELEASE NEW APP VERSION

### YES - YOU MUST DEPLOY A NEW VERSION

**Why**:
1. `shopify.app.toml` is app configuration metadata
2. Shopify Partner Dashboard reads this file during app submission/review
3. Changes to TOML require redeploying app version
4. Automated checks scan deployed app version, not local codebase

### Deployment Steps

#### Step 1: Install Shopify CLI (if not installed)
```bash
npm install -g @shopify/cli @shopify/app
```

#### Step 2: Authenticate with Shopify Partners
```bash
shopify auth login
```

#### Step 3: Link App to Partner Dashboard
```bash
cd /Users/cruzfrangieh/Desktop/instaxhealth\ website
shopify app config link
```
- Select your app from the list
- This creates `.shopify-cli.yml` file with app credentials

#### Step 4: Push Configuration to Shopify
```bash
shopify app deploy
```

This will:
- Read `shopify.app.toml`
- Upload app configuration to Shopify Partner Dashboard
- Update app version with new webhook configuration
- Register compliance webhooks automatically

#### Step 5: Verify in Partner Dashboard
1. Go to Shopify Partner Dashboard → Apps → Your App
2. Click on "API access" or "Webhooks" section
3. Verify you see:
   - `customers/data_request` → `https://instahealth.ae/api/shopify/compliance`
   - `customers/redact` → `https://instahealth.ae/api/shopify/compliance`
   - `shop/redact` → `https://instahealth.ae/api/shopify/compliance`

### Alternative: Manual Configuration (NOT RECOMMENDED)

If you don't want to use Shopify CLI, you can manually configure in Partner Dashboard:

1. Go to Partner Dashboard → Apps → Your App → Settings → Webhooks
2. Add 3 webhook subscriptions:
   - Topic: `customers/data_request`, URL: `https://instahealth.ae/api/shopify/compliance`
   - Topic: `customers/redact`, URL: `https://instahealth.ae/api/shopify/compliance`
   - Topic: `shop/redact`, URL: `https://instahealth.ae/api/shopify/compliance`

**However**: This doesn't update `shopify.app.toml`, so automated checks may still fail.

---

## G. EXACT RE-TEST STEPS

### Prerequisites
1. All environment variables set in production:
   ```bash
   SHOPIFY_CLIENT_ID=<your-client-id>
   SHOPIFY_CLIENT_SECRET=shpcs_<your-client-secret>
   NEXT_PUBLIC_APP_URL=https://instahealth.ae
   DATABASE_URL=<your-postgres-url>
   NEXTAUTH_SECRET=<your-secret>
   ```

2. Production deployment complete:
   ```bash
   npm run build
   # Deploy to Vercel/Railway/your-host
   ```

3. Shopify CLI deployment complete:
   ```bash
   shopify app deploy
   ```

---

### Test 1: Verify TOML Configuration Deployed

**Action**:
```bash
shopify app config push
```

**Expected Output**:
```
✓ Configuration pushed successfully
✓ Webhooks registered:
  - customers/data_request → /api/shopify/compliance
  - customers/redact → /api/shopify/compliance
  - shop/redact → /api/shopify/compliance
```

**Verify in Partner Dashboard**:
1. Navigate to: Partner Dashboard → Apps → Your App → Settings → Webhooks
2. Look for 3 compliance webhook subscriptions
3. All should point to `https://instahealth.ae/api/shopify/compliance`

---

### Test 2: Verify Compliance Endpoint Reachable

**Test Missing HMAC (should return 401)**:
```bash
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected Response**:
```json
{
  "error": "Unauthorized - missing authentication headers"
}
```

**Expected Status Code**: `401 Unauthorized` (NOT 400)

---

**Test Invalid HMAC (should return 401)**:
```bash
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: invalid_signature_here" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Topic: customers/data_request" \
  -d '{"test": "data"}'
```

**Expected Response**:
```json
{
  "error": "Unauthorized - invalid signature"
}
```

**Expected Status Code**: `401 Unauthorized`

---

### Test 3: Verify Legacy GDPR Endpoints (Optional)

**Test each legacy endpoint returns 401 for missing HMAC**:

```bash
# customers/data_request
curl -X POST https://instahealth.ae/api/shopify/gdpr/customers-data-request \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# customers/redact
curl -X POST https://instahealth.ae/api/shopify/gdpr/customers-redact \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# shop/redact
curl -X POST https://instahealth.ae/api/shopify/gdpr/shop-redact \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected**: All return `401 Unauthorized` with error message "Unauthorized - missing authentication headers"

---

### Test 4: Install App on Development Store

**Action**:
1. In Partner Dashboard → Apps → Your App → Test your app
2. Select a development store
3. Click "Install app"
4. Complete OAuth flow
5. Verify redirect to `https://instahealth.ae/shopify?shop={shop}&shopify=connected`
6. Verify app home page loads without errors

**Expected**:
- No 404 errors
- App home page renders
- Success message shows
- No console errors

---

### Test 5: Re-Run Shopify Automated Checks

**Action**:
1. Go to Partner Dashboard → Apps → Your App
2. Click "Test your app" or "Distribution" → "Submit for review"
3. Look for automated checks section
4. Click "Run checks" or wait for automatic check

**Expected Results**:

✅ **Install/Redirect Check**:
- "Immediately redirects to app UI after authentication" → **PASS**
- Expected: 200 OK from `https://instahealth.ae/shopify`

✅ **Compliance Webhooks Check**:
- "Provides mandatory compliance webhooks" → **PASS**
- Expected: All 3 GDPR topics found in app configuration

✅ **HMAC Verification Check**:
- "Verifies webhooks with HMAC signatures" → **PASS**
- Expected: Invalid HMAC returns 401 Unauthorized

---

### Test 6: Verify Webhook Delivery (Live Test)

**Action**:
1. Install app on development store (if not already installed)
2. In Partner Dashboard → Apps → Your App → Webhooks
3. Find one of the compliance webhooks (e.g., `customers/data_request`)
4. Click "Send test webhook"

**Expected**:
- Shopify sends test webhook to `https://instahealth.ae/api/shopify/compliance`
- App returns 200 OK
- App logs show: `[SHOPIFY_COMPLIANCE] ✅ HMAC signature verified`
- In Partner Dashboard, webhook delivery shows "Success" with 200 status

**If Fails**:
- Check production logs for errors
- Verify `SHOPIFY_CLIENT_SECRET` is set correctly
- Verify endpoint is reachable (not behind auth middleware)

---

### Test 7: Verify HMAC Signature Calculation

**Generate Valid HMAC for Testing** (Node.js):
```javascript
const crypto = require('crypto');

const secret = process.env.SHOPIFY_CLIENT_SECRET;
const body = JSON.stringify({ test: "data" });
const hmac = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');

console.log('HMAC:', hmac);
console.log('Body:', body);
```

**Test with Valid HMAC**:
```bash
curl -X POST https://instahealth.ae/api/shopify/compliance \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: <generated_hmac>" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Topic: customers/data_request" \
  -d '{"test":"data"}'
```

**Expected**: 200 OK with acknowledgment message

---

## FINAL DEPLOYMENT CHECKLIST

### Code Changes
- [x] Created `shopify.app.toml` in root directory
- [x] Created `/api/shopify/compliance` endpoint
- [x] Updated all GDPR endpoints to return 401 for missing HMAC
- [x] Updated product webhook endpoint to return 401 for missing HMAC

### Configuration
- [ ] Set `SHOPIFY_CLIENT_ID` in production environment
- [ ] Set `SHOPIFY_CLIENT_SECRET` in production environment
- [ ] Set `NEXT_PUBLIC_APP_URL=https://instahealth.ae` in production
- [ ] Verified Shopify Partner Dashboard "App URL" is `https://instahealth.ae/shopify`
- [ ] Verified redirect URLs include `https://instahealth.ae/api/shopify/callback`

### Deployment
- [ ] Run `npm run build` locally to verify no build errors
- [ ] Deploy to production (Vercel/Railway)
- [ ] Install Shopify CLI: `npm install -g @shopify/cli @shopify/app`
- [ ] Authenticate: `shopify auth login`
- [ ] Link app: `shopify app config link`
- [ ] Deploy TOML: `shopify app deploy`

### Verification
- [ ] Verify `/shopify` returns 200 OK
- [ ] Verify `/api/shopify/compliance` returns 401 for missing HMAC
- [ ] Verify compliance webhooks visible in Partner Dashboard
- [ ] Install app on development store
- [ ] Send test webhook from Partner Dashboard
- [ ] Re-run automated checks in Partner Dashboard

### Expected Automated Check Results
- [ ] ✅ "Immediately redirects to app UI after authentication"
- [ ] ✅ "Provides mandatory compliance webhooks"
- [ ] ✅ "Verifies webhooks with HMAC signatures"

---

## TROUBLESHOOTING

### Automated Check Still Fails: "Provides mandatory compliance webhooks"

**Possible Causes**:
1. `shopify.app.toml` not deployed via CLI
2. Webhooks not visible in Partner Dashboard
3. App version not updated

**Solution**:
```bash
# Re-deploy TOML configuration
shopify app deploy

# Verify webhooks in Partner Dashboard
# Go to: Apps → Your App → Settings → Webhooks
# Should see 3 compliance webhooks pointing to /api/shopify/compliance
```

---

### Automated Check Still Fails: "Verifies webhooks with HMAC signatures"

**Possible Causes**:
1. Endpoint still returning 400 instead of 401
2. HMAC verification logic incorrect
3. Wrong secret used for verification

**Solution**:
```bash
# Test endpoint returns 401
curl -X POST https://instahealth.ae/api/shopify/compliance

# Should see status: 401 Unauthorized
# NOT status: 400 Bad Request
```

**Verify Code**:
```typescript
// Check all webhook routes use:
if (!hmac || !shopDomain) {
  return NextResponse.json({ ... }, { status: 401 });  // ✅ 401 not 400
}
```

---

### Webhook Delivery Fails in Production

**Possible Causes**:
1. `SHOPIFY_CLIENT_SECRET` not set in production
2. Endpoint returns 500 error
3. Database connection fails

**Solution**:
1. Check production logs for errors
2. Verify environment variables are set
3. Test database connection
4. Verify endpoint is not behind auth middleware

---

## CONCLUSION

### What Was Fixed
1. ✅ Created `shopify.app.toml` to declare compliance webhooks at config level
2. ✅ Created unified `/api/shopify/compliance` endpoint for all GDPR webhooks
3. ✅ Changed all HMAC error responses from 400 to 401
4. ✅ Maintained backward compatibility with legacy GDPR endpoints

### Why Checks Were Failing
1. ❌ No `shopify.app.toml` → Shopify couldn't detect compliance webhook config
2. ❌ Returning 400 for invalid HMAC → Shopify requires 401 per documentation
3. ❌ Config not deployed → Automated checks scan deployed app version

### Next Steps
1. Deploy code to production
2. Run `shopify app deploy` to push TOML configuration
3. Verify webhooks in Partner Dashboard
4. Install app on development store
5. Re-run automated checks

**Expected Result**: All 3 automated checks pass ✅
