#!/bin/bash
# pgloader Migration Runner
# Reads Supabase password from SUPABASE_PASS environment variable
# Usage: SUPABASE_PASS="password" ./scripts/run_pgloader_migration.sh

set -e

# Load migration env variables (placeholders only, no password)
source ".env.migrate.local"

# Validate required environment variable
if [ -z "$SUPABASE_PASS" ]; then
  echo "❌ ERROR: SUPABASE_PASS environment variable not set"
  echo "Usage: SUPABASE_PASS='your-password' ./scripts/run_pgloader_migration.sh"
  exit 1
fi

# Build connection string (password injected at runtime)
POSTGRES_URL="postgresql://${SUPABASE_USER}:${SUPABASE_PASS}@${SUPABASE_HOST}:${SUPABASE_PORT}/${SUPABASE_DB}"

echo "🔒 Migration Runner Started"
echo "📊 Source: SQLite (${SQLITE_PATH})"
echo "🗄️  Target: Supabase PostgreSQL (${SUPABASE_HOST})"
echo ""
echo "⏳ Starting pgloader migration..."
echo "   (This may take a few minutes)"
echo ""

# Run pgloader with the dynamically built connection string
pgloader "sqlite:///${SQLITE_PATH}" "${POSTGRES_URL}"

echo ""
echo "✅ pgloader migration completed"
echo "📋 Next: Run validation queries to verify data integrity"
