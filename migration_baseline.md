# Database Migration Baseline

**Generated:** 2026-01-27  
**Source:** SQLite (`prisma/prisma/dev.db`)  
**Target:** Supabase PostgreSQL

## Baseline Row Counts (SQLite)

| Table | Row Count |
|-------|-----------|
| Vendor | 30 |
| Product | 79 |
| ProductVariant | 0 |
| Location | 3 |
| ProductLocation | 3 |
| User | 1 |
| Order | 0 |
| OrderItem | 0 |
| Cart | 1 |
| CartItem | 0 |
| VendorPayout | 0 |
| Account | 0 |
| Session | 0 |
| VerificationToken | 0 |

**Total Tables:** 14  
**Total Rows:** 117

## Critical Tables with Data

1. **Vendor** (30 rows) - Active marketplace vendors
2. **Product** (79 rows) - Product catalog
3. **Location** (3 rows) - Service locations
4. **ProductLocation** (3 rows) - Product-location associations
5. **User** (1 row) - Admin user
6. **Cart** (1 row) - Active cart

## Migration Strategy

1. **Schema Creation**
   - Use Prisma migration to create PostgreSQL schema
   - Preserve all indexes and constraints
   
2. **Data Migration**
   - Use Prisma client-to-client migration (preserves IDs)
   - Batch size: 50 records per table
   - Tables to migrate in order (respecting FK dependencies):
     1. Location (no dependencies)
     2. User (no dependencies)
     3. Vendor (no dependencies)
     4. Product (depends on Vendor)
     5. ProductVariant (depends on Product)
     6. ProductLocation (depends on Product, Location)
     7. Cart (depends on User, Location)
     8. CartItem (depends on Cart, Product, ProductVariant)
     9. Order (depends on User)
     10. OrderItem (depends on Order, Product, Vendor, ProductVariant)
     11. VendorPayout (depends on Vendor)
     12. Account (depends on User)
     13. Session (depends on User)
     14. VerificationToken (standalone)

3. **Validation**
   - Verify row counts match exactly
   - Run FK orphan checks (no orphaned references)
   - Spot-check critical records (vendors, products, admin user)

## Rollback Plan

If migration fails or data is corrupt:
1. Keep SQLite database untouched
2. Drop Postgres tables and re-run migration
3. Never delete SQLite until migration is validated
