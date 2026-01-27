#!/bin/bash
# Quick verification script for Task Completion

echo "=================================="
echo "🔍 VERIFICATION SCRIPT"
echo "=================================="
echo ""

# Check if dev server is running
echo "1. Checking dev server..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "   ✅ Dev server running on http://localhost:3001"
else
    echo "   ⚠️  Dev server not running. Run: npm run dev"
fi
echo ""

# Check for Shopify remnants
echo "2. Checking for Shopify remnants..."
SHOPIFY_COUNT=$(find . -type f -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | xargs grep -l "shopify" 2>/dev/null | grep -v ".md" | grep -v "COMPLETION_SUMMARY" | wc -l | tr -d ' ')
if [ "$SHOPIFY_COUNT" -eq "0" ]; then
    echo "   ✅ No Shopify code found (except in docs)"
else
    echo "   ⚠️  Found $SHOPIFY_COUNT files mentioning Shopify"
    find . -type f \( -name "*.ts" -o -name "*.tsx" \) | grep -v node_modules | grep -v .next | xargs grep -l "shopify" 2>/dev/null | grep -v ".md"
fi
echo ""

# Check for stub files
echo "3. Checking for stub keywords..."
STUB_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) | grep -v node_modules | grep -v .next | xargs grep -l "Stub\|TODO: Shopify" 2>/dev/null | grep -v ".md" | wc -l | tr -d ' ')
if [ "$STUB_COUNT" -eq "0" ]; then
    echo "   ✅ No stubs found"
else
    echo "   ⚠️  Found $STUB_COUNT files with stubs"
fi
echo ""

# Check migration status
echo "4. Checking Prisma migration status..."
if DATABASE_URL="file:./prisma/dev.db" npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
    echo "   ✅ Migrations up to date"
else
    echo "   ⚠️  Migration issues detected"
fi
echo ""

# Check test data
echo "5. Checking test data..."
if [ -f "prisma/dev.db" ]; then
    echo "   ✅ Database exists"
    # Quick query to check if test products exist
    PRODUCT_COUNT=$(echo "SELECT COUNT(*) FROM Product;" | sqlite3 prisma/dev.db 2>/dev/null)
    VENDOR_COUNT=$(echo "SELECT COUNT(*) FROM Vendor;" | sqlite3 prisma/dev.db 2>/dev/null)
    echo "   📊 Products: $PRODUCT_COUNT"
    echo "   📊 Vendors: $VENDOR_COUNT"
else
    echo "   ⚠️  Database not found. Run: npm run seed:e2e"
fi
echo ""

# Check for key routes
echo "6. Checking key routes exist..."
ROUTES=(
    "app/marketplace/peptides/page.tsx"
    "app/product/[handle]/page.tsx"
    "app/admin/orders/page.tsx"
    "app/admin/payouts/page.tsx"
    "components/products/ProductDetailWithVariants.tsx"
)

for route in "${ROUTES[@]}"; do
    if [ -f "$route" ]; then
        echo "   ✅ $route"
    else
        echo "   ❌ Missing: $route"
    fi
done
echo ""

echo "=================================="
echo "📋 SUMMARY"
echo "=================================="
echo "✅ = Ready"
echo "⚠️  = Needs attention"
echo "❌ = Missing/Error"
echo ""
echo "Next steps:"
echo "1. If dev server not running: npm run dev"
echo "2. Open browser: http://localhost:3001"
echo "3. Follow E2E_TEST_CHECKLIST.md"
echo ""
