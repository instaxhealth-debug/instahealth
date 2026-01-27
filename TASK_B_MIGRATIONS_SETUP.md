# Task B: Prisma Migrations Baseline Setup

## Current State
- Database has been managed with `prisma db push` (non-interactive mode)
- Migration folder exists: `prisma/migrations/20260112123610_initial_schema/`
- Schema is stable and matches current database

## Goal
Establish a proper migrations baseline so future changes use `prisma migrate dev` / `prisma migrate deploy`

## Commands to Run (Interactive Terminal - Mac)

### Step 1: Reset migrations to baseline
```bash
cd "/Users/cruzfrangieh/Desktop/instaxhealth website"

# Mark existing migrations as applied without running them (if DB already matches schema)
npx prisma migrate resolve --applied "20260112123610_initial_schema"
```

### Step 2: Verify migration status
```bash
npx prisma migrate status
```

You should see: "Database schema is up to date!"

### Step 3: For FUTURE schema changes, use:
```bash
# Development (creates migration + applies it)
npx prisma migrate dev --name <descriptive_name>

# Production deployment
npx prisma migrate deploy
```

## NEVER USE AGAIN
❌ `npx prisma db push` (except for throwaway local experiments)

## Verification
After running Step 1-2, check:
- [ ] `prisma migrate status` shows "up to date"
- [ ] No pending migrations
- [ ] Database schema matches schema.prisma

## Notes
- Current migration `20260112123610_initial_schema` was created but may not have been marked as applied
- Using `migrate resolve --applied` marks it as executed without re-running it
- This prevents drift between schema and actual database state
