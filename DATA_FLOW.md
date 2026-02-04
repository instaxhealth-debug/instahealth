# Data Flow Architecture

## CRITICAL: NO AUTOMATIC SYNC

**Data is NEVER automatically synced between DEV and PROD.**

This document explains how data reaches production and how to prevent accidental writes to the live database.

---

## Database Separation

### DEV Neon Database
- **URL**: Set via `DATABASE_URL` in `.env.local` (local development)
- **Used by**: Local developers, preview deployments
- **Data**: Test/development data only
- **Safety**: Any operations here are safe; data is temporary

### PROD Neon Database
- **URL**: Set via `DATABASE_URL` in Vercel Production environment
- **Used by**: Production deployment only (instahealth.ae)
- **Data**: Real customer data
- **Safety**: CRITICAL - any operation here affects live customers

### Data Move Rule
```
DEV Database ≠ PROD Database
↓
No sync
↓
DEV changes never auto-reach PROD
```

---

## How Data Reaches Production

### Route 1: Via Admin UI (RECOMMENDED)
1. Admin logs into production (instahealth.ae)
2. Admin visits `/admin` dashboard
3. Admin creates/edits vendors, products, etc.
4. Changes write directly to PROD database
5. Changes are live immediately

**When to use**: Quick vendor onboarding, product management, catalog updates

### Route 2: Via Seed Scripts (CONTROLLED)
1. Admin has access to PROD database credentials
2. Admin runs: `DATABASE_URL=<PROD_URL> npm run prisma:seed`
3. Seed script executes against PROD database
4. Changes write directly to PROD database

**When to use**: Bulk data import, initial setup, recovery from data loss

### Route 3: Via Export/Import (MANUAL)
1. Admin exports data from DEV: `SELECT * FROM vendors;`
2. Admin reviews exported data for safety
3. Admin manually imports into PROD
4. Admin verifies data integrity

**When to use**: Complex migrations, data validation required, audit trail needed

---

## What Does NOT Sync

| Operation | DEV Result | PROD Result | Auto-Sync? |
|-----------|-----------|-----------|-----------|
| `npm run prisma:migrate` (local) | Migrates DEV | Nothing | ❌ No |
| `npm run prisma:seed` (local) | Seeds DEV | Nothing | ❌ No |
| `npx prisma studio` (edit) | Edits DEV | Nothing | ❌ No |
| Code deployment to Vercel | Deploys code | Deploys code | ✅ Yes (code only) |
| Database changes in DEV | Affects DEV | Nothing | ❌ No |

**Summary**: Code moves via Git → Vercel. Data NEVER moves automatically.

---

## Prevention of Accidental Writes to PROD

### 1. Environment Variables (First Layer)
```bash
# Local development
DATABASE_URL=postgresql://...@ep-DEV-INSTANCE.../...

# Vercel Production (set in project settings)
DATABASE_URL=postgresql://...@ep-PROD-INSTANCE.../...

# Vercel Preview (inherited from DEV)
DATABASE_URL=postgresql://...@ep-DEV-INSTANCE.../...
```

**Protection**: Wrong credentials = wrong database = prevented write

### 2. Database Guardrail (Second Layer)
On server boot, logs:
```
🟢 DEV (development)
Database Host: ep-dev-instance.c-3.us-east-1.aws.neon.tech

or

🔴 PROD (production)
Database Host: ep-prod-instance.c-3.us-east-1.aws.neon.tech
⚠️  WARNING: Connected to PRODUCTION database
```

**Protection**: Dev sees obvious indicator which database they're connected to

### 3. Code Review (Third Layer)
- Destructive migrations require code review
- Seed scripts require approval before deployment
- Admin routes require authentication + authorization

**Protection**: Peer review catches accidental bulk operations

---

## Migrations and Schema Changes

### DEV Workflow
```bash
# 1. Develop locally against DEV Neon
DATABASE_URL=<DEV_URL> npx prisma migrate dev --name my_change

# 2. Test locally
npm run dev

# 3. Commit and push
git push origin feature-branch

# 4. Create PR, get reviewed

# 5. Merge to main
```

### PROD Workflow
```bash
# 1. Code is deployed to Vercel Production automatically
#    (but DATABASE_URL still points to PROD)

# 2. Vercel runs build (migrations are skipped in build)

# 3. Migration is applied by:
#    a) Manual run: DATABASE_URL=<PROD_URL> npx prisma migrate deploy
#    b) Deployment pipeline (if configured)
#    c) Or manually via DB admin console
```

**Rule**: Never auto-run migrations on PROD. Always manual + verified.

---

## Vendor Authentication (No Database Access)

Vendors authenticate via email + password.
- No vendor has direct database access
- No vendor can run migrations
- No vendor can run seed scripts
- Vendors can only access their own orders/products via API

**Architecture**:
```
Vendor Login (email + password)
    ↓
NextAuth Session
    ↓
requireVendor() derives vendorId from session
    ↓
API checks: vendorOrder.vendorId === vendorId
    ↓
✅ Access granted (only their data)
```

**Safety**: Vendor identity is enforced at API level, not DB level.

---

## Checklist: Before Any Database Write

- [ ] Are you connected to the correct database? (Check guardrail log)
- [ ] Is this operation safe? (Delete, update, drop table?)
- [ ] Has this been reviewed? (Code review, team approval?)
- [ ] Is this intentional? (Not an accident, not a typo?)
- [ ] Can you roll back if needed? (Do you have backups?)

**If any answer is NO, STOP and ask for help.**

---

## Emergency: Accidental PROD Write

If you accidentally wrote to PROD:

1. **STOP** - Do not make more changes
2. **LOG** - Note what happened and when
3. **VERIFY** - Check what data was affected
4. **ALERT** - Tell the team immediately
5. **ASSESS** - Is it safe to leave? Does it need rollback?
6. **EXECUTE** - Rollback via snapshot or manual undo
7. **DOCUMENT** - Update this guide to prevent recurrence

Contact: support@instahealth.ae

---

## FAQ

### Q: Can I run Prisma Studio against production?
**A:** Yes, but be VERY careful. `npx prisma studio` opens a GUI to edit whatever DATABASE_URL points to. If DATABASE_URL=PROD, you can accidentally edit live data. Recommended: Only use against DEV.

### Q: What if I commit `.env.local` with PROD credentials?
**A:** `.env.local` is in `.gitignore` (it should NEVER be committed). If it happens:
1. Rotate credentials immediately
2. Invalidate old credentials in Neon
3. Update Vercel with new credentials

### Q: How do I test data changes before production?
**A:** 
1. Make changes in DEV (locally)
2. Validate thoroughly
3. Write a seed script that documents the change
4. Run seed script against DEV once more
5. Get team approval for the script
6. Run seed script against PROD

### Q: What if I need to copy data from DEV to PROD?
**A:** Never bulk-copy. Instead:
1. Export specific records: `SELECT * FROM vendors WHERE id='...' \G`
2. Review each record manually
3. Manually insert into PROD via Admin UI or INSERT statement
4. Verify integrity

### Q: Can vendors cause data loss?
**A:** No. Vendors have read-only access to their own data via API. They cannot:
- Run migrations
- Run seed scripts
- Drop tables
- Access other vendors' data
- Access customer data
- Access admin functions

---

## Summary

```
✅ Safe: Local DEV Neon changes
✅ Safe: Manual PROD writes via Admin UI
✅ Safe: Vendor API access (read-only their data)

❌ Unsafe: Auto-sync DEV → PROD
❌ Unsafe: Vendor database access
❌ Unsafe: Unreviewed migrations to PROD
❌ Unsafe: Bulk deletes without backup
```

**Remember**: Data is precious. Move it carefully.
