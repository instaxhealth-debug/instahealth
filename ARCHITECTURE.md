# InstaHealth Architecture Documentation

## Overview

InstaHealth is a multi-vertical health marketplace built with Next.js 14 (App Router), providing a unified interface for:
- **InstaPepz**: Physical products (e-commerce via Shopify headless)
- **InstaIVZ**: Mobile IV drip services (booking-based)
- **InstaBloodz**: Blood testing services (booking-based)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand
- **Search**: Algolia
- **Products**: Shopify Storefront API (headless)
- **Bookings**: Abstracted booking provider (Acuity/Calendly-compatible)
- **Payments**: Shopify Checkout (products), Stripe (bookings)
- **Location**: Google Places Autocomplete

## Project Structure

```
/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with header
│   ├── page.tsx           # Homepage
│   ├── cart/              # Shopping cart
│   ├── pepz/              # InstaPepz product pages
│   ├── ivz/               # InstaIVZ service pages
│   └── bloodz/            # InstaBloodz test pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components (Header, etc.)
│   ├── location/         # Location selector components
│   ├── search/           # Search components
│   ├── home/             # Homepage components
│   ├── pepz/             # Product components
│   ├── ivz/              # IV service components
│   ├── bloodz/           # Blood test components
│   ├── cart/             # Cart components
│   └── booking/          # Booking flow components
├── lib/                  # Utilities and business logic
│   ├── api/             # API integrations
│   ├── store/           # Zustand stores
│   └── utils.ts         # Utility functions
└── types/               # TypeScript type definitions
```

## Data Models

### Core Types

- **User**: User account information
- **Address**: Delivery/service location with geocoding
- **Vertical**: Brand identifier (pepz, ivz, bloodz)
- **Category**: Product/service categorization
- **Item**: Base type for products, services, and tests
- **Product**: Physical product from Shopify
- **IVService**: IV drip service
- **BloodTest**: Blood testing service
- **Order**: Product order (Shopify)
- **Booking**: Service/test appointment
- **BookingSlot**: Available time slot
- **Promotion**: Marketing promotions

See `types/index.ts` for complete type definitions.

## Site Map

### Public Pages

- `/` - Homepage
  - Location selector (blocking if not selected)
  - Category carousel
  - Promo banners
  - Available now cards
  - Featured items

### InstaPepz (Products)

- `/pepz` - Product listing
- `/pepz/products/[slug]` - Product detail
- `/cart` - Shopping cart
- `/checkout` - Shopify checkout redirect

### InstaIVZ (IV Services)

- `/ivz` - Service listing
- `/ivz/services/[slug]` - Service detail
- Booking flow (modal):
  1. Date selection
  2. Time slot selection
  3. Payment & confirmation

### InstaBloodz (Blood Tests)

- `/bloodz` - Test listing
- `/bloodz/tests/[slug]` - Test detail
- Booking flow (modal):
  1. At-home vs clinic selection (if applicable)
  2. Date selection
  3. Time slot selection
  4. Payment & confirmation

### Account

- `/account` - User account dashboard
- `/account/orders` - Order history
- `/account/bookings` - Booking history

## Component Architecture

### Layout Components

- **Header**: Global navigation with logo, location, search, account, cart
- **LocationGate**: Blocks homepage content until location is selected
- **LocationSelector**: Location picker button
- **LocationDialog**: Modal for address selection (Google Places)

### Homepage Components

- **CategoryCarousel**: Horizontal scrolling category tiles
- **PromoBanner**: Rotating promotional banners
- **AvailableNow**: Quick access cards for each vertical
- **FeaturedSection**: Featured products, services, and tests

### Product Components

- **ProductGrid**: Grid of product cards
- **ProductDetail**: Product detail page with add to cart

### Service Components

- **ServiceGrid**: Grid of IV service cards
- **ServiceDetail**: Service detail with booking CTA

### Test Components

- **TestGrid**: Grid of blood test cards
- **TestDetail**: Test detail with booking CTA

### Booking Components

- **BookingDialog**: Multi-step booking flow modal
  - Date selection
  - Time slot selection
  - Payment & confirmation

### Cart Components

- **CartView**: Shopping cart with item management
- Separate from booking flow (products only)

## API Integration Strategy

### Shopify (Products)

**Location**: `lib/api/shopify.ts`

- **getProducts()**: Fetch product listing
- **getProductByHandle()**: Fetch single product
- **createCheckout()**: Create Shopify checkout session

**Integration Points**:
- Product pages fetch from Shopify Storefront API
- Cart items stored locally (Zustand)
- Checkout redirects to Shopify hosted checkout

### Booking System

**Location**: `lib/api/booking.ts`

Abstracted interface compatible with:
- Acuity Scheduling
- Calendly
- Custom booking systems

**Methods**:
- **getAvailableSlots()**: Fetch available time slots
- **createBooking()**: Create booking and return payment URL

**Integration Points**:
- Service/test detail pages
- BookingDialog component
- Separate from product cart

### Search (Algolia)

**Location**: `lib/api/search.ts`

- **searchItems()**: Global search across all item types
- **indexItem()**: Index single item
- **indexItems()**: Batch index items

**Index Structure**:
- Single index: `instahealth_items`
- Fields: All item properties + type, vertical
- Location-based filtering via `aroundLatLng`

### Location (Google Places)

**Location**: `lib/api/location.ts`

- **getPlaceSuggestions()**: Autocomplete suggestions
- **getPlaceDetails()**: Get full address details with geocoding

## State Management

### Zustand Stores

**Location Store** (`lib/store/location-store.ts`):
- Current delivery address
- Location selection state
- Persisted to localStorage

**Cart Store** (`lib/store/cart-store.ts`):
- Product cart items
- Quantity management
- Total calculations
- Persisted to localStorage

## Search Strategy

### Algolia Configuration

1. **Index Setup**:
  - Single index: `instahealth_items`
   - Attributes: All item fields
   - Facets: `type`, `vertical`, `categoryId`

2. **Indexing**:
   - Products: Indexed from Shopify webhooks
   - Services/Tests: Indexed from booking system
   - Real-time updates via webhooks

3. **Search Features**:
   - Global search across all item types
   - Location-based filtering
   - Typo tolerance
   - Result ranking by relevance

## Booking Abstraction Design

### Provider Interface

```typescript
interface BookingProvider {
  getAvailableSlots(...): Promise<BookingSlot[]>;
  createBooking(...): Promise<{ bookingId: string; paymentUrl?: string }>;
}
```

### Implementation Strategy

1. **Provider Selection**: Environment variable determines provider
2. **Adapter Pattern**: Each provider has adapter implementation
3. **Unified API**: Same interface regardless of provider

### Supported Providers

- **Acuity Scheduling**: Via Acuity API
- **Calendly**: Via Calendly API
- **Custom**: Internal booking system

## Payment Flow

### Products (Shopify)

1. Add to cart (local state)
2. Review cart
3. Redirect to Shopify checkout
4. Shopify handles payment
5. Redirect back with order confirmation

### Services/Tests (Stripe)

1. Select date/time slot
2. Confirm booking details
3. Create booking via provider
4. Redirect to Stripe payment (if required)
5. Confirm booking

## Environment Variables

```env
# Shopify
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=

# Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Booking Provider
BOOKING_PROVIDER=acuity|calendly|custom
BOOKING_API_KEY=
```

## Performance Considerations

1. **Skeleton Loaders**: All data-fetching components show skeletons
2. **Image Optimization**: Next.js Image component with CDN
3. **Code Splitting**: Route-based code splitting (automatic)
4. **Caching**: 
   - Static pages: ISR
   - API routes: Cache headers
   - Algolia: Client-side caching

## Security

1. **API Keys**: Client-side keys are public (Storefront API, Algolia)
2. **Server Actions**: Sensitive operations via server actions
3. **Input Validation**: Zod schemas for all inputs
4. **XSS Protection**: React's built-in escaping
5. **CSRF**: Next.js built-in protection

## Deployment

### Recommended Platform: Vercel

1. **Build**: `npm run build`
2. **Environment Variables**: Set in Vercel dashboard
3. **Domain**: Configure custom domain
4. **Analytics**: Vercel Analytics integration

### CI/CD

- GitHub Actions for testing
- Automatic deployments on push to main
- Preview deployments for PRs

## Future Enhancements

1. **Real-time Inventory**: WebSocket updates
2. **Push Notifications**: Booking reminders
3. **Loyalty Program**: Points and rewards
4. **Subscription Services**: Recurring bookings
5. **Mobile App**: React Native wrapper

## Success Criteria

✅ User can:
- Land on site
- Pick location
- Search across all verticals
- Order peptides (products)
- Book an IV drip
- Book a blood test
- Complete checkout with zero confusion

