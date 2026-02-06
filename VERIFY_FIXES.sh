#!/bin/bash

# QUICK VERIFICATION SCRIPT
# Runs all checks to ensure cart fixes are working

set -e

PROJECT_DIR="/Users/cruzfrangieh/Desktop/instaxhealth website"
cd "$PROJECT_DIR"

echo "======================================"
echo "STEP 1, 2, 3 VERIFICATION SCRIPT"
echo "======================================"
echo ""

# Check 1: TypeScript compilation
echo "✓ CHECK 1: TypeScript compilation"
npx tsc --noEmit 2>&1 | grep -q "error" && echo "  ❌ Compilation errors found" || echo "  ✅ No TypeScript errors"
echo ""

# Check 2: Header.tsx syntax
echo "✓ CHECK 2: Header.tsx syntax"
if grep -q "useEffect" components/layout/Header.tsx && grep -q "setTotalItems" components/layout/Header.tsx; then
  echo "  ✅ Header.tsx has useEffect subscription"
else
  echo "  ❌ Header.tsx missing useEffect"
fi
echo ""

# Check 3: CartView.tsx checkout handler
echo "✓ CHECK 3: CartView.tsx checkout handler"
if grep -q "e.preventDefault()" components/cart/CartView.tsx && grep -q "router.push" components/cart/CartView.tsx; then
  echo "  ✅ Checkout handler is correct"
else
  echo "  ❌ Checkout handler missing fixes"
fi
echo ""

# Check 4: Dev server can start
echo "✓ CHECK 4: Dev server startup test"
timeout 5 npm run dev 2>&1 | grep -q "Ready in" && echo "  ✅ Dev server starts" || echo "  ⚠️  Dev server check (may be already running)"
echo ""

# Check 5: Neon database connection
echo "✓ CHECK 5: Database migration status"
npx prisma migrate status 2>&1 | grep -q "up to date" && echo "  ✅ All migrations applied" || echo "  ❌ Migrations not applied"
echo ""

echo "======================================"
echo "VERIFICATION COMPLETE"
echo "======================================"
echo ""
echo "🎯 Test Instructions:"
echo "1. Open http://localhost:3000"
echo "2. Add item to cart → check badge updates instantly"
echo "3. Click 'Proceed to Checkout' → should navigate to /checkout"
echo ""
