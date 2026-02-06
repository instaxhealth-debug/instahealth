#!/bin/bash

# Quick script to enable cart debug logging

echo "🔍 Enabling Cart Debug Logging..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Creating .env.local..."
  touch .env.local
fi

# Add debug flags if not already present
if ! grep -q "NEXT_PUBLIC_DEBUG_CART" .env.local; then
  echo "NEXT_PUBLIC_DEBUG_CART=true" >> .env.local
  echo "✅ Added NEXT_PUBLIC_DEBUG_CART=true"
else
  echo "ℹ️  NEXT_PUBLIC_DEBUG_CART already exists in .env.local"
fi

if ! grep -q "DEBUG_CART" .env.local; then
  echo "DEBUG_CART=true" >> .env.local
  echo "✅ Added DEBUG_CART=true"
else
  echo "ℹ️  DEBUG_CART already exists in .env.local"
fi

echo ""
echo "✅ Debug logging enabled!"
echo ""
echo "Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Open browser console (F12)"
echo "3. Perform cart operations (add/remove/update)"
echo "4. Check console for [CART:*] logs"
echo "5. Check terminal for [API:CART:*] logs"
echo ""
echo "To disable debugging later, edit .env.local and set both to false"
