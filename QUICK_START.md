# Quick Start Guide

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
Create a `.env.local` file in the root directory with:
```env
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-token
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-key
```

3. **Run development server**:
```bash
npm run dev
```

4. **Open browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure Overview

```
instahealth/
├── app/              # Next.js pages (App Router)
├── components/       # React components
├── lib/             # Utilities and API integrations
├── types/           # TypeScript type definitions
└── hooks/           # Custom React hooks
```

## Key Features

### 1. Location Selection
- Users must select a location before browsing
- Location stored in Zustand (persisted)
- Used for delivery ETAs and booking availability

### 2. Global Search
- Search across all verticals (products, services, tests)
- Algolia integration (placeholder)
- Location-aware results

### 3. Product Shopping (InstaPepz)
- Browse products
- Add to cart
- Checkout via Shopify

### 4. Service Booking (InstaIVZ)
- Browse IV services
- Book appointments
- Multi-step booking flow

### 5. Test Booking (InstaBloodz)
- Browse blood tests
- Book appointments
- At-home or clinic options

## Development Workflow

### Adding a New Component
1. Create file in appropriate `components/` subdirectory
2. Use shadcn/ui components from `components/ui/`
3. Follow existing patterns

### Adding a New Page
1. Create file in `app/` directory
2. Use App Router conventions
3. Update site map documentation

### API Integration
- Shopify: `lib/api/shopify.ts`
- Booking: `lib/api/booking.ts`
- Search: `lib/api/search.ts`
- Location: `lib/api/location.ts`

## Common Tasks

### Fetch Products
```typescript
import { getProducts } from "@/lib/api/shopify";
const products = await getProducts();
```

### Add to Cart
```typescript
import { useCartStore } from "@/lib/store/cart-store";
const { addItem } = useCartStore();
addItem(product, variantId, quantity);
```

### Get Location
```typescript
import { useLocationStore } from "@/lib/store/location-store";
const { address, isSelected } = useLocationStore();
```

## Next Steps

1. **Connect APIs**: Replace placeholder implementations
2. **Add Real Data**: Connect to Shopify, booking system
3. **Configure Search**: Set up Algolia index
4. **Add Images**: Replace placeholder gradients
5. **Test Flows**: Verify all user journeys

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for detailed TODO list.

