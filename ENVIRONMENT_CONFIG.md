# Environment Configuration Guide

## Overview

InstaHealth uses **Neon PostgreSQL** for all database operations with strict DEV/PROD separation.

- **No SQLite** in production workflow
- **Two Neon instances**: One for DEV, one for PROD
- **No automatic sync** between environments
- **Vendor authentication** via email + password (no OAuth, no database access)

---

## Database Configuration

### Local Development

Set these variables in `.env.local` (git-ignored):

```bash
# Use your DEV Neon database
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-dev-instance.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-dev-instance.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**What this does**:
- Local development connects to DEV Neon
- `npm run dev` uses DEV Neon
- Prisma Studio opens DEV Neon
- Seed scripts run against DEV Neon
- All changes are safe; they only affect DEV

### Vercel Preview Deployments

Preview deployments automatically inherit the DEV environment variables:

```bash
DATABASE_URL=<DEV_NEON_URL>
DIRECT_URL=<DEV_NEON_URL>
```

**What this does**:
- Preview builds use DEV Neon
- Preview deployments NEVER touch PROD data
- Preview is a safe staging environment
- Data is safe to test with

### Vercel Production Deployment

Production deployments use separate environment variables (set in Vercel Project Settings):

```bash
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-prod-instance.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-prod-instance.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**What this does**:
- Production deployment connects to PROD Neon
- Only live instahealth.ae deployment uses PROD database
- All live customer data is in PROD only
- Admin UI edits go directly to PROD

---

## How to Configure in Vercel

### Step 1: Set Production Environment Variables

1. Go to Vercel Project Settings → Environment Variables
2. Create two sets of variables:

**For Production Environment**:
```
DATABASE_URL = postgresql://...@ep-prod-instance.../neondb?...
DIRECT_URL = postgresql://...@ep-prod-instance.../neondb?...
```

**For Preview Environment** (optional, inherits from default):
```
DATABASE_URL = postgresql://...@ep-dev-instance.../neondb?...
DIRECT_URL = postgresql://...@ep-dev-instance.../neondb?...
```

### Step 2: Verify in Vercel Deployments

After deploying, check the build logs:

```
📊 DATABASE CONNECTION
🟢 DEV (preview)
or
🔴 PROD (production)
```

This log confirms which database the deployment connected to.

---

## Neon Setup

### Creating DEV Neon Database

1. Go to https://neon.tech
2. Create project: `instahealth-dev`
3. Copy connection string
4. Add to `.env.local` as `DATABASE_URL`

### Creating PROD Neon Database

1. Go to https://neon.tech
2. Create project: `instahealth-prod`
3. Copy connection string
4. Save in secure location (LastPass, 1Password, etc.)
5. Add to Vercel as Production `DATABASE_URL`

### Rotating Credentials

If Neon credentials are compromised:

1. In Neon console, regenerate password for role
2. Update `.env.local` with new credentials
3. Update Vercel Production variables with new credentials
4. Redeploy Vercel
5. Document in incident log

---

## NextAuth Configuration

```bash
# For local development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# For production
NEXTAUTH_URL=https://instahealth.ae
NEXTAUTH_SECRET=<same-secret-for-all-environments>
```

Generate secret:
```bash
openssl rand -base64 32
```

---

## Google OAuth Configuration

Get credentials from Google Cloud Console:

```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Admin email that gets ADMIN role
ADMIN_EMAIL=admin@instahealth.ae
```

---

## Stripe Configuration

Get credentials from Stripe Dashboard:

```bash
# For development (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# For production (replace with live keys in Vercel)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Algolia Configuration

Get credentials from Algolia Dashboard:

```bash
# Public keys (safe for frontend)
NEXT_PUBLIC_ALGOLIA_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=YOUR_SEARCH_KEY

# Private keys (backend only)
ALGOLIA_WRITE_API_KEY=YOUR_WRITE_KEY
ALGOLIA_ADMIN_API_KEY=YOUR_ADMIN_KEY

# Index name (dev vs prod)
ALGOLIA_PRODUCTS_INDEX=products_dev  # or products_prod in PROD
```

---

## Vendor Authentication Variables

No special env vars needed for vendor auth. Instead:

**User Model**:
```
email: string (unique)
passwordHash: string (bcrypt hashed)
role: enum (USER | VENDOR | ADMIN)
```

**Vendor Model**:
```
userId: string (unique, links to User.id)
```

**Auth Flow**:
1. Vendor signs up: email + password stored in User
2. Admin creates Vendor with userId link
3. Vendor logs in: email + password
4. requireVendor() middleware derives vendorId from session
5. Vendor sees only their data

**Security**:
- No vendor has database access
- No vendor database credentials in env
- VendorId enforced at API level
- All vendor routes require session auth

---

## Checking Current Configuration

### Local Development

```bash
# Show what database you're connected to
npm run dev
# Look for log: 🟢 DEV or 🔴 PROD
```

### Vercel Production

```bash
# Check Vercel deployment logs
# Look for log: 🟢 DEV (preview) or 🔴 PROD (production)
```

---

## Common Issues

### Issue: Connected to wrong database

**Symptom**: See 🔴 PROD in local logs (should be 🟢 DEV)

**Fix**:
1. Check `.env.local` DATABASE_URL value
2. Verify it points to DEV Neon (check hostname)
3. Restart `npm run dev`

### Issue: Can't connect to Neon

**Symptom**: `connection refused` or timeout error

**Fix**:
1. Check DATABASE_URL format in .env.local
2. Verify Neon database is running
3. Check firewall/network access to Neon
4. Verify credentials are correct

### Issue: Migrations fail

**Symptom**: `Error: Migration failed` when running `npm run prisma:migrate`

**Fix**:
1. Ensure DIRECT_URL is set in .env.local
2. DIRECT_URL must point to same database as DATABASE_URL
3. Run: `npx prisma migrate status` to check pending migrations

### Issue: Vendor login doesn't work

**Symptom**: 403 error when visiting /vendor after login

**Fix**:
1. Check user has role=VENDOR in database
2. Check vendor.userId is set to user.id
3. Check Vendor record exists for the userId
4. Run: `SELECT * FROM "User" WHERE email='vendor@example.com';`

---

## Best Practices

1. ✅ **Always check guardrail logs** before running destructive operations
2. ✅ **Use .env.local for development only** (never commit it)
3. ✅ **Set Vercel env vars separately** for Production/Preview
4. ✅ **Rotate credentials regularly** in secure storage
5. ✅ **Document any custom configuration** in this file

---

## Support

If you have questions:
- Email: support@instahealth.ae
- Docs: See DATA_FLOW.md for architecture
- Prisma Docs: https://www.prisma.io/docs
- Neon Docs: https://neon.tech/docs
