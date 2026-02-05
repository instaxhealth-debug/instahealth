#!/bin/bash
# Test script to reproduce the 3 cart/checkout issues
# Usage: ./test-cart-issues.sh

echo "=========================================="
echo "CART & CHECKOUT DEBUGGING TEST SUITE"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${YELLOW}[0] Checking if dev server is running...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}✗ Dev server is not running at localhost:3000${NC}"
    echo "Please start it with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Get session cookie
echo -e "${YELLOW}[1] Checking authentication session...${NC}"
SESSION_RESPONSE=$(curl -s -c cookies.txt http://localhost:3000/api/auth/session)
echo "Session response: $SESSION_RESPONSE"

# Check if authenticated
if echo "$SESSION_RESPONSE" | grep -q '"user"'; then
    echo -e "${GREEN}✓ User is authenticated${NC}"
    USER_EMAIL=$(echo "$SESSION_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo "User: $USER_EMAIL"
else
    echo -e "${RED}✗ User is NOT authenticated${NC}"
    echo "Please login at http://localhost:3000 first"
    exit 1
fi
echo ""

# Get current cart
echo -e "${YELLOW}[2] Fetching current cart state...${NC}"
CART_RESPONSE=$(curl -s -b cookies.txt http://localhost:3000/api/cart)
echo "Cart response: $CART_RESPONSE"
CART_ITEMS=$(echo "$CART_RESPONSE" | grep -o '"items":\[.*\]' | wc -c)
if [ "$CART_ITEMS" -gt 10 ]; then
    echo -e "${GREEN}✓ Cart exists with items${NC}"
else
    echo -e "${YELLOW}⚠ Cart is empty or doesn't exist${NC}"
fi
echo ""

# TEST 1: Add to cart
echo -e "${YELLOW}[TEST 1] Testing 'Add to Cart' functionality...${NC}"
echo "Attempting to add product to cart..."

# Get a product ID from the database
echo "Fetching a product ID..."
# This would need a real product ID - let's try a common one
PRODUCT_ID="cm5e0u6sp000013rxl95dg1fj"

echo "Adding product $PRODUCT_ID to cart..."
ADD_RESPONSE=$(curl -s -b cookies.txt -w "\nHTTP_STATUS:%{http_code}" \
    -X POST http://localhost:3000/api/cart \
    -H "Content-Type: application/json" \
    -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1,\"action\":\"add\"}")

HTTP_STATUS=$(echo "$ADD_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$ADD_RESPONSE" | grep -v "HTTP_STATUS")

echo "Response status: $HTTP_STATUS"
echo "Response body: $RESPONSE_BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Add to cart API returned 200${NC}"
    if echo "$RESPONSE_BODY" | grep -q '"items"'; then
        echo -e "${GREEN}✓ Cart items returned in response${NC}"
    else
        echo -e "${RED}✗ No items in response${NC}"
    fi
else
    echo -e "${RED}✗ Add to cart failed with status $HTTP_STATUS${NC}"
fi
echo ""

# TEST 2: Get current cart to check stuck items
echo -e "${YELLOW}[TEST 2] Checking for stuck/ghost cart items...${NC}"
CART_CHECK=$(curl -s -b cookies.txt http://localhost:3000/api/cart)
echo "Current cart: $CART_CHECK"

# Check if there are items with invalid references
if echo "$CART_CHECK" | grep -q '"product":null'; then
    echo -e "${RED}✗ Found item(s) with null product (ghost item)${NC}"
elif echo "$CART_CHECK" | grep -q '"items":\[\]'; then
    echo -e "${YELLOW}⚠ Cart is empty${NC}"
else
    echo -e "${GREEN}✓ Cart items appear valid${NC}"
fi

# Try to remove the first item if it exists
FIRST_ITEM_PRODUCT=$(echo "$CART_CHECK" | grep -o '"productId":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ ! -z "$FIRST_ITEM_PRODUCT" ]; then
    echo "Attempting to remove item with productId: $FIRST_ITEM_PRODUCT"
    REMOVE_RESPONSE=$(curl -s -b cookies.txt -w "\nHTTP_STATUS:%{http_code}" \
        -X POST http://localhost:3000/api/cart \
        -H "Content-Type: application/json" \
        -d "{\"productId\":\"$FIRST_ITEM_PRODUCT\",\"quantity\":0,\"action\":\"remove\"}")
    
    REMOVE_STATUS=$(echo "$REMOVE_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
    echo "Remove response status: $REMOVE_STATUS"
    
    if [ "$REMOVE_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ Remove item API returned 200${NC}"
    else
        echo -e "${RED}✗ Remove item failed with status $REMOVE_STATUS${NC}"
    fi
fi
echo ""

# TEST 3: Checkout flow
echo -e "${YELLOW}[TEST 3] Testing checkout flow (without actually completing)...${NC}"

# First ensure cart has items
CART_FINAL=$(curl -s -b cookies.txt http://localhost:3000/api/cart)
if echo "$CART_FINAL" | grep -q '"items":\['; then
    echo "Cart has items, testing checkout create..."
    
    # This would require a valid address ID - we'll just test the endpoint is accessible
    echo "Note: Full checkout test requires valid address and form data"
    echo "Check browser console when clicking 'Proceed to Payment' button"
    echo "Expected console logs:"
    echo "  - [CHECKOUT] Submitting with address..."
    echo "  - [CHECKOUT] Order created..."
    echo "  - [CHECKOUT] Redirecting to Stripe..."
else
    echo -e "${YELLOW}⚠ Cart is empty, cannot test checkout${NC}"
fi
echo ""

echo "=========================================="
echo "Test Summary:"
echo "1. Add to cart: Check logs above"
echo "2. Remove item: Check logs above"
echo "3. Checkout: Must test in browser with console open"
echo ""
echo "Next steps:"
echo "1. Check terminal logs for [API:CART:*] and [CART:*] messages"
echo "2. Open browser DevTools console"
echo "3. Try adding product to cart - watch for [CART:ADD] logs"
echo "4. Try removing item - watch for [CART:REMOVE] logs"
echo "5. Try checkout - watch for [CHECKOUT] logs"
echo "=========================================="

# Cleanup
rm -f cookies.txt
