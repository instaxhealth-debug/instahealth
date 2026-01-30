#!/bin/bash

# Auth/Session Fix - Test Verification Script
# Run this script to verify all auth fixes are working correctly

set -e

echo "🔧 Auth/Session Fix - Test Verification Script"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Development server is not running on port 3000${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Development server is running${NC}"
echo ""

# Database path
DB_PATH="prisma/prisma/dev.db"

if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Error: Database not found at $DB_PATH${NC}"
    exit 1
fi

echo "📊 Database Status"
echo "===================="

# Check admin user
ADMIN_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM User WHERE role='ADMIN';" 2>/dev/null || echo "0")
echo -e "Admin users: ${GREEN}${ADMIN_COUNT}${NC}"

if [ "$ADMIN_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No admin user found. Creating one...${NC}"
    npm run seed:admin
    echo ""
fi

# Check total users
USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
echo -e "Total users: ${GREEN}${USER_COUNT}${NC}"

# Check carts
CART_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Cart;" 2>/dev/null || echo "0")
echo -e "Total carts: ${GREEN}${CART_COUNT}${NC}"

# Check orders
ORDER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM 'Order';" 2>/dev/null || echo "0")
echo -e "Total orders: ${GREEN}${ORDER_COUNT}${NC}"

echo ""
echo "👤 Admin User Details"
echo "====================="
sqlite3 "$DB_PATH" "SELECT 'Email: ' || email, 'Role: ' || role FROM User WHERE role='ADMIN' LIMIT 1;" 2>/dev/null || echo "No admin user"

echo ""
echo ""
echo "🧪 Manual Test Checklist"
echo "========================"
echo ""

echo "Test 1: Logout Flow"
echo "-------------------"
echo "1. Open http://localhost:3000/login"
echo "2. Login with any user (e.g., cruzfrangieh22@gmail.com)"
echo "3. Go to /account and click 'Sign Out'"
echo "4. Verify: Redirected to homepage"
echo "5. Try accessing /account → should redirect to /login"
echo -e "${YELLOW}Status: Manual verification required${NC}"
echo ""

echo "Test 2: Admin Access (Direct)"
echo "-----------------------------"
echo "1. Open http://localhost:3000/login"
echo "2. Login with admin credentials:"
echo "   - Email: cruz@jccl.com.au"
echo "   - Password: frangido3."
echo "3. Verify: Immediately redirected to /admin (NOT /account)"
echo "4. Navigate to /admin/vendors → should load immediately"
echo "5. DO NOT visit /orders first - admin should work independently"
echo -e "${YELLOW}Status: Manual verification required${NC}"
echo ""

echo "Test 3: User + Cart Persistence"
echo "-------------------------------"
echo "1. Register new user at /register"
echo "2. Add 2-3 products to cart from /marketplace"
echo "3. Go to /cart and verify items are there"
echo "4. Click 'Sign Out' from /account"
echo "5. Login again with same credentials"
echo "6. Go to /cart → verify same items are still there"
echo -e "${YELLOW}Status: Manual verification required${NC}"
echo ""

echo "Test 4: Cart Auto-Creation"
echo "--------------------------"
echo "Testing with existing user: levi@instapepz.com"
USER_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM User WHERE email='levi@instapepz.com' LIMIT 1;" 2>/dev/null || echo "")

if [ -n "$USER_ID" ]; then
    echo "Found user ID: $USER_ID"
    
    # Check if cart exists
    CART_EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Cart WHERE userId='$USER_ID';" 2>/dev/null || echo "0")
    
    if [ "$CART_EXISTS" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No cart found for user. Will be auto-created on login.${NC}"
    else
        echo -e "${GREEN}✅ Cart already exists for user${NC}"
        
        # Show cart contents
        CART_ITEMS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM CartItem WHERE cartId IN (SELECT id FROM Cart WHERE userId='$USER_ID');" 2>/dev/null || echo "0")
        echo "Cart items: $CART_ITEMS"
    fi
else
    echo -e "${RED}❌ User not found${NC}"
fi
echo ""

echo "📝 Files Modified"
echo "================="
echo "1. components/ui/LogoutButton.tsx - Fixed logout with router.refresh()"
echo "2. lib/admin-auth.ts - Fixed import path bug"
echo "3. lib/auth.ts - Added signIn callback for cart creation"
echo "4. app/api/auth/signout/route.ts - Properly use signOut"
echo ""

echo "🌐 Quick Access URLs"
echo "===================="
echo "Homepage:       http://localhost:3000"
echo "Login:          http://localhost:3000/login"
echo "Admin Dashboard: http://localhost:3000/admin"
echo "Account:        http://localhost:3000/account"
echo "Cart:           http://localhost:3000/cart"
echo "Orders:         http://localhost:3000/orders"
echo "Marketplace:    http://localhost:3000/marketplace"
echo ""

echo "📚 Documentation"
echo "================"
echo "See AUTH_FIX_SUMMARY.md for complete documentation"
echo ""

echo -e "${GREEN}✅ Verification script complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run the manual tests above"
echo "2. Verify all flows work as expected"
echo "3. Report any issues"
