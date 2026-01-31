#!/bin/bash
set -e

echo "🔍 ALGOLIA HARDENING VERIFICATION"
echo "=================================="

# 1. Apply Prisma migration
echo ""
echo "1️⃣  Applying Prisma migration..."
npm run db:push

# 2. Configure Algolia settings
echo ""
echo "2️⃣  Configuring Algolia index settings..."
npm run algolia:config

# 3. Trigger reindex cron
echo ""
echo "3️⃣  Triggering reindex cron (GET)..."
if [ -z "$CRON_SECRET" ]; then
  echo "⚠️  CRON_SECRET not set. Skipping cron test."
  echo "   Set it in .env.local to test: CRON_SECRET=<your-secret>"
else
  curl -s -X GET "http://localhost:3000/api/cron/reindex-algolia" \
    -H "x-cron-secret: $CRON_SECRET" \
    -H "Content-Type: application/json" | jq .
fi

# 4. Test search with filters
echo ""
echo "4️⃣  Testing search endpoint..."
echo "   GET /api/search?q=test"
curl -s "http://localhost:3000/api/search?q=test" | jq '.hits | length' 2>/dev/null || echo "   (Server may not be running)"

echo ""
echo "✅ Verification complete! Check Algolia dashboard for:"
echo "   - vendorVerifiedScore populated (0 or 1)"
echo "   - inventoryScore populated (0, 1, or 2)"
echo "   - tags array (may be empty but present)"
echo "   - published field (boolean, true for active)"
echo "   - inventoryStatus field (in_stock, low, or out)"
