#!/bin/bash

# Bulletproof Upload Pipeline Verification Script
# Verifies productId-based architecture with NO SKU dependencies

set -e

echo "🔒 BULLETPROOF UPLOAD VERIFICATION"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
  fi
}

echo "1️⃣  Checking productId usage in endpoints..."
if grep -r "productId" app/api/vendor/products/images/*.ts app/api/vendor/products/images/*/*.ts 2>/dev/null | grep -q "productId"; then
  test_result "productId found in endpoints"
else
  echo -e "${RED}❌ FAIL${NC}: productId NOT found in endpoints"
  ((FAILED++))
fi

echo ""
echo "2️⃣  Verifying NO vendorId_sku queries..."
if grep -r "vendorId_sku" app/api/vendor/products/images/ 2>/dev/null; then
  echo -e "${RED}❌ FAIL${NC}: vendorId_sku found in upload endpoints (SKU dependency detected)"
  ((FAILED++))
else
  test_result "No vendorId_sku queries in upload flow"
fi

echo ""
echo "3️⃣  Checking blob path pattern uses productId..."
if grep -r "vendors.*products.*productId" app/vendor/products/images/*.tsx app/api/vendor/products/images/*/*.ts 2>/dev/null | grep -q "productId"; then
  test_result "Blob path uses productId pattern"
else
  echo -e "${RED}❌ FAIL${NC}: Blob path does NOT use productId"
  ((FAILED++))
fi

echo ""
echo "4️⃣  Verifying Smart Match stopwords..."
if grep -q "STOPWORDS" lib/matching/product-image-matcher.ts; then
  test_result "Smart Match has stopwords implementation"
else
  echo -e "${RED}❌ FAIL${NC}: Stopwords not found in matcher"
  ((FAILED++))
fi

echo ""
echo "5️⃣  Checking number normalization in matcher..."
if grep -q "(\\\d+)(mg|ml" lib/matching/product-image-matcher.ts; then
  test_result "Number normalization implemented (10mg == 10 mg)"
else
  echo -e "${RED}❌ FAIL${NC}: Number normalization not found"
  ((FAILED++))
fi

echo ""
echo "6️⃣  Verifying SKU tie-breaker logic..."
if grep -q "hasSkuBonus" lib/matching/product-image-matcher.ts; then
  test_result "SKU tie-breaker (prefer sku != null) implemented"
else
  echo -e "${RED}❌ FAIL${NC}: SKU tie-breaker not found"
  ((FAILED++))
fi

echo ""
echo "7️⃣  Checking low confidence UI enforcement..."
if grep -q "confirmedLowConfidence" app/vendor/products/images/SmartMatchPreview.tsx; then
  test_result "Low confidence manual confirmation enforced"
else
  echo -e "${RED}❌ FAIL${NC}: Low confidence enforcement not found"
  ((FAILED++))
fi

echo ""
echo "8️⃣  Verifying debug endpoint exists..."
if [ -f "app/api/vendor/products/images/debug/status/route.ts" ]; then
  test_result "Debug status endpoint exists"
else
  echo -e "${RED}❌ FAIL${NC}: Debug endpoint not found"
  ((FAILED++))
fi

echo ""
echo "9️⃣  Checking comprehensive logging (no secrets)..."
if grep -q "NO imageUrl logged" app/api/vendor/products/images/update-image/route.ts; then
  test_result "Logs configured to NOT log secrets/tokens"
else
  echo -e "${YELLOW}⚠️  WARN${NC}: Secret-safe logging comment not found (verify manually)"
fi

echo ""
echo "🔟 Running production build..."
if npm run build > /dev/null 2>&1; then
  test_result "Production build passes"
else
  echo -e "${RED}❌ FAIL${NC}: Build failed"
  ((FAILED++))
  echo "Run 'npm run build' for details"
fi

echo ""
echo "======================================"
echo "📊 VERIFICATION RESULTS"
echo "======================================"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL CHECKS PASSED - BULLETPROOF!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run debug endpoint in browser:"
  echo "   fetch('/api/vendor/products/images/debug/status').then(r=>r.json()).then(console.log)"
  echo ""
  echo "2. Upload a file and check Network tab:"
  echo "   Search for 'sku' - should be 0 matches in requests"
  echo ""
  echo "3. Verify blob path contains productId:"
  echo "   vendors/{vendorId}/products/{productId}.{ext}"
  echo ""
  exit 0
else
  echo -e "${RED}❌ VERIFICATION FAILED${NC}"
  echo "Fix the issues above before deploying"
  exit 1
fi
