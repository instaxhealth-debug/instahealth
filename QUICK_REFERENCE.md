# Quick Reference: Database & Vendor Auth

## For Daily Development

### Checking Which Database You're Connected To

```bash
npm run dev
# Look for one of these logs:

🟢 DEV (development)
Database Host: ep-twilight-smoke-ahwt4pmh.c-3.us-east-1.aws.neon.tech

# or

🔴 PROD (production)
⚠️  WARNING: Connected to PRODUCTION database
```

**If you see 🔴 PROD in local development, STOP and check your `.env.local`**

### Testing Vendor Login

```bash
# 1. Create a test vendor (via admin panel or SQL)
# 2. Go to http://localhost:3001/vendor/login
# 3. Enter vendor email + password
# 4. Should redirect to http://localhost:3001/vendor dashboard
```

### Database Operations

```bash
# Local development (uses DEV Neon from .env.local)
npx prisma studio
# ✅ Safe - edits DEV only

npm run prisma:migrate
# ✅ Safe - migrates DEV only

npm run prisma:seed
# ✅ Safe - seeds DEV only
```

### Important: Never Accidentally Hit PROD

**Scenario 1: You changed .env.local to PROD URL**
```bash
# WRONG! ❌
DATABASE_URL=postgresql://...@ep-prod-instance.../...

# Undo immediately:
# 1. Change back to DEV URL
# 2. Never commit PROD credentials to .env.local
# 3. .env.local is in .gitignore - should never be committed
```

**Scenario 2: You see 🔴 PROD warning**
```bash
# WRONG! ❌
npm run dev
# 🔴 PROD (production)

# This means your .env.local is wrong
# Fix it before running ANY database operations
```

---

## For Production Operations

### Setting Up Production Database

See [ENVIRONMENT_CONFIG.md#vercel-environment-configuration](ENVIRONMENT_CONFIG.md#how-to-configure-in-vercel)

1. Create PROD Neon instance in Neon console
2. Copy connection string
3. Add to Vercel Project Settings → Environment Variables
4. Set for "Production" environment only
5. Deploy Vercel
6. Check logs for 🔴 PROD indicator

### Making Data Changes to Production

**Option 1: Via Admin UI (EASIEST)**
```
1. Go to https://instahealth.ae/admin
2. Create/edit vendors, products, etc.
3. Changes write directly to PROD Neon
```

**Option 2: Via Seed Script (CONTROLLED)**
```bash
# Create script documenting the change
# Get team approval
# Then run:
DATABASE_URL=<PROD_URL> npm run prisma:seed
```

**Option 3: Manual Export/Import (SAFEST)**
```bash
# Export from DEV
psql $DEV_DATABASE_URL -c "SELECT * FROM vendors;" > vendors.sql

# Review the data
cat vendors.sql

# Import to PROD (if approved)
psql $PROD_DATABASE_URL < vendors.sql
```

---

## For Adding New Vendor Routes

### Template for Protected Vendor Endpoint

```typescript
// app/api/vendor/[something]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVendor } from '@/lib/auth/requireVendor';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // ✅ ALWAYS use requireVendor()
    const { vendorId, userId } = await requireVendor();

    // ✅ ALWAYS verify ownership
    const vendorData = await prisma.vendorOrder.findUnique({
      where: { id: ... }
    });

    if (vendorData.vendorId !== vendorId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Now it's safe to return vendor data
    return NextResponse.json(vendorData);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Rules for Vendor Routes

- ✅ Always use `requireVendor()` at route start
- ✅ Always verify vendor owns the data
- ✅ Always return 403 if mismatch
- ❌ Never accept vendorId from request body
- ❌ Never accept vendorId from headers
- ❌ Never bypass ownership checks

---

## For Vendor Onboarding

### Create New Vendor (Admin Only)

**Via Admin Panel** (recommended):
1. Go to `/admin/vendors`
2. Fill in vendor details
3. Submit form
4. Vendor account created with temporary password

**Via Database**:
```sql
-- 1. Create user with VENDOR role
INSERT INTO "User" (id, email, "passwordHash", role)
VALUES (
  'uuid-123',
  'vendor@example.com',
  '$2a$10$...',  -- bcrypt hash
  'VENDOR'
);

-- 2. Create vendor linked to user
INSERT INTO "Vendor" (id, name, slug, "userId", status)
VALUES (
  'vendor-456',
  'My Vendor',
  'my-vendor',
  'uuid-123',
  'active'
);
```

### Send to Vendor

```
Email from: noreply@instahealth.ae

Subject: Your InstaHealth Vendor Account

Hello [Vendor Name],

Your vendor account is ready!

Login URL: https://instahealth.ae/vendor/login
Email: [vendor@example.com]
Temporary Password: [initial-password]

Please change your password on first login.

Questions? Contact support@instahealth.ae
```

---

## Environment Variables Checklist

### Local Development (.env.local)

- [ ] DATABASE_URL = DEV Neon URL
- [ ] DIRECT_URL = DEV Neon URL
- [ ] NEXTAUTH_SECRET = 32-char secret
- [ ] NEXTAUTH_URL = http://localhost:3000 (or 3001)
- [ ] GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- [ ] STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- [ ] ALGOLIA keys
- [ ] ADMIN_EMAIL

### Vercel Preview Environment

- [ ] DATABASE_URL = DEV Neon URL (inherited)
- [ ] DIRECT_URL = DEV Neon URL (inherited)

### Vercel Production Environment

- [ ] DATABASE_URL = PROD Neon URL
- [ ] DIRECT_URL = PROD Neon URL
- [ ] NEXTAUTH_SECRET = same as dev
- [ ] NEXTAUTH_URL = https://instahealth.ae
- [ ] STRIPE_SECRET_KEY = live keys
- [ ] STRIPE_WEBHOOK_SECRET = live secret
- [ ] ALGOLIA keys = prod index
- [ ] ADMIN_EMAIL = admin account

---

## Key Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [DATA_FLOW.md](DATA_FLOW.md) | How data moves to production | Before any PROD operation |
| [ENVIRONMENT_CONFIG.md](ENVIRONMENT_CONFIG.md) | Setting up environments | When configuring new system |
| [VENDOR_AUTH_SYSTEM.md](VENDOR_AUTH_SYSTEM.md) | Vendor auth details | When adding vendor features |
| [IMPLEMENTATION_COMPLETE_VENDOR_NEON.md](IMPLEMENTATION_COMPLETE_VENDOR_NEON.md) | Full implementation summary | Overview of what was done |

---

## Emergency: Accidental PROD Write

If you accidentally wrote to PROD:

1. **STOP** - Do not make more changes
2. **LOG** - Note what happened and timestamp
3. **ALERT** - Tell the team immediately (Slack #incidents)
4. **ASSESS** - Is it safe to leave? Does it need rollback?
5. **FIX** - Rollback via Neon snapshot or manual undo
6. **DOCUMENT** - Update this guide to prevent recurrence

Contact: support@instahealth.ae or #incidents Slack

---

## Support

- **Docs**: See DATA_FLOW.md and ENVIRONMENT_CONFIG.md
- **Questions**: Ask in #engineering Slack
- **Issues**: Create GitHub issue with [VENDOR-AUTH] prefix
- **Emergencies**: Page on-call engineer
