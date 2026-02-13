# Import Key Migration - Resolution Summary

## Overview
Successfully resolved Prisma migration drift and applied the `importKey` column to the Product table for idempotent product imports.

## Problem
The migration `20260212113619_add_import_key_for_idempotency` was marked as "applied" in Prisma's migration history table (`_prisma_migrations`), but the actual database schema did not have the `importKey` column. This created a drift state where:
- Migration history said: "applied"
- Database schema: column missing
- Prisma could not proceed with `migrate dev` or rollback commands

## Root Cause
The migration was interrupted (terminal `^C`) during initial application, causing:
1. Migration record was written to `_prisma_migrations` table
2. SQL statements were NOT executed against the database
3. Checksum mismatch due to file edits after marking as applied

## Resolution Steps

### 1. Verified Database State
```bash
# Confirmed column doesn't exist
node check-importkey-column.mjs
# Result: importKey column exists in DB: false
```

### 2. Removed Corrupted Migration Record
Since the migration was marked "applied" but SQL never ran, we manually removed it from the history table:
```javascript
// remove-migration-record.mjs
await prisma.$executeRaw`
  DELETE FROM _prisma_migrations 
  WHERE migration_name = '20260212113619_add_import_key_for_idempotency'
`;
```

### 3. Applied Migration with Deploy Command
```bash
npx prisma migrate deploy --schema=prisma/schema.prisma
# Successfully applied: 20260212113619_add_import_key_for_idempotency
```

### 4. Verified Success
```bash
# Column now exists
node check-importkey-column.mjs
# ✅ importKey column exists in DB: true
# ✅ Product_vendorId_importKey_key unique index exists: true

# No drift detected
npx prisma migrate status
# ✅ Database schema is up to date!
```

## Migration Details

### SQL Applied
```sql
-- Add nullable importKey column
ALTER TABLE "Product" ADD COLUMN "importKey" TEXT;

-- Create unique constraint on (vendorId, importKey)
CREATE UNIQUE INDEX "Product_vendorId_importKey_key" 
ON "Product" ("vendorId", "importKey");
```

### Schema Changes
```prisma
model Product {
  // ... existing fields
  importKey       String?
  
  @@unique([vendorId, sku])
  @@unique([vendorId, importKey])  // 👈 NEW
}
```

### Code Changes
Updated [app/api/vendor/products/import/commit/route.ts](app/api/vendor/products/import/commit/route.ts) to compute `importKey` for products without SKU:

```typescript
function computeImportKey(name: string, category: string, priceFils: number): string {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, " ");
  const payload = `${normalized}|${category}|${priceFils}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
```

## Idempotency Logic

### For Products WITH SKU
- Use `@@unique([vendorId, sku])` constraint
- Batch operations use `skipDuplicates: true`

### For Products WITHOUT SKU
- Compute `importKey` from: name + category + price
- Use `@@unique([vendorId, importKey])` constraint
- Prevents duplicate imports of same product data

## Testing
✅ TypeScript compilation passes (`npx tsc --noEmit`)
✅ Prisma client regenerated with importKey types
✅ Unique constraint prevents duplicates
✅ No migration drift detected

## Final State
- **Migration**: 20 migrations applied, all in sync
- **Database**: Product table has `importKey` column with unique constraint
- **Code**: Import route uses importKey for idempotent creates/updates
- **Status**: Ready for production use

## Key Learnings
1. **Never edit migration files after they're applied** - breaks checksums
2. **Terminal interrupts during migration can corrupt state** - always verify with `migrate status`
3. **`migrate resolve --rolled-back` only works on FAILED state**, not APPLIED
4. **Manual intervention required** when migration history and DB are out of sync:
   - Remove corrupted record from `_prisma_migrations`
   - Re-apply migration with `migrate deploy`

## Commands Reference
```bash
# Check migration status
npx prisma migrate status

# Apply pending migrations (production-safe)
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Verify TypeScript
npx tsc --noEmit
```

## Related Files
- [prisma/schema.prisma](prisma/schema.prisma) - Product model definition
- [prisma/migrations/20260212113619_add_import_key_for_idempotency/migration.sql](prisma/migrations/20260212113619_add_import_key_for_idempotency/migration.sql) - Migration SQL
- [app/api/vendor/products/import/commit/route.ts](app/api/vendor/products/import/commit/route.ts) - Import logic using importKey

---

**Date**: 2026-02-12  
**Status**: ✅ COMPLETE  
**Migration**: 20260212113619_add_import_key_for_idempotency  
**Database**: Neon PostgreSQL (dev)
