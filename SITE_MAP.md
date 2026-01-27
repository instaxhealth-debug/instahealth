# InstaHealth Site Map

## Public Routes

### Homepage
- `/` - Main landing page
  - Location selector (blocking modal if not selected)
  - Category carousel (InstaPepz, InstaIVZ, InstaBloodz, Performance, Recovery, Longevity, Energy, Beauty)
  - Promotional banner carousel
  - "Available Now" cards (delivery ETA, next booking slots)
  - Featured products section
  - Featured IV drips section
  - Featured blood tests section

### InstaPepz (Products)
- `/pepz` - Product listing page
  - Grid of product cards
  - Category filters
  - Search and sort
- `/pepz/products/[slug]` - Product detail page
  - Product images
  - Description and details
  - Price and availability
  - Add to cart / Buy now
  - Delivery ETA (if location selected)
- `/cart` - Shopping cart
  - Cart items with quantity controls
  - Order summary
  - Proceed to checkout button
- `/checkout` - Checkout redirect
  - Redirects to Shopify hosted checkout

### InstaIVZ (IV Services)
- `/ivz` - Service listing page
  - Grid of IV service cards
  - Filter by category
  - Search
- `/ivz/services/[slug]` - Service detail page
  - Service description
  - Benefits and ingredients
  - Duration and pricing
  - Book appointment button
  - Booking flow (modal):
    1. Date selection
    2. Available time slots
    3. Payment and confirmation

### InstaBloodz (Blood Tests)
- `/bloodz` - Test listing page
  - Grid of blood test cards
  - Filter by category
  - Search
- `/bloodz/tests/[slug]` - Test detail page
  - Test description
  - Test markers
  - At-home vs clinic options (if applicable)
  - Duration and pricing
  - Book appointment button
  - Booking flow (modal):
    1. Location type selection (at-home/clinic)
    2. Date selection
    3. Available time slots
    4. Payment and confirmation

### Account (Future)
- `/account` - Account dashboard
- `/account/orders` - Order history (products)
- `/account/bookings` - Booking history (services/tests)
- `/account/addresses` - Saved addresses
- `/account/settings` - Account settings

## Component Hierarchy

### Global Components
- `Header` - Always visible
  - Logo
  - Location selector
  - Global search
  - Account icon
  - Cart icon (with item count)

### Homepage Components
- `LocationGate` - Blocks content until location selected
- `CategoryCarousel` - Horizontal scrolling categories
- `PromoBanner` - Rotating promotional banners
- `AvailableNow` - Quick access cards
- `FeaturedSection` - Featured items by vertical

### Product Components
- `ProductGrid` - Product listing grid
- `ProductDetail` - Product detail view
- `CartView` - Shopping cart interface

### Service Components
- `ServiceGrid` - IV service listing grid
- `ServiceDetail` - Service detail view
- `BookingDialog` - Multi-step booking flow

### Test Components
- `TestGrid` - Blood test listing grid
- `TestDetail` - Test detail view
- `BookingDialog` - Multi-step booking flow (shared)

### Shared Components
- `BookingDialog` - Used by both IVZ and Bloodz
- `LocationDialog` - Address selection modal
- `GlobalSearch` - Search dropdown with results

## Navigation Flow

### Product Purchase Flow
1. Browse products (`/pepz`)
2. View product (`/pepz/products/[slug]`)
3. Add to cart (stored in Zustand)
4. Review cart (`/cart`)
5. Checkout (`/checkout` → Shopify)

### Service Booking Flow
1. Browse services (`/ivz`)
2. View service (`/ivz/services/[slug]`)
3. Click "Book Appointment"
4. BookingDialog opens:
   - Select date
   - Select time slot
   - Confirm and pay
5. Booking confirmation

### Test Booking Flow
1. Browse tests (`/bloodz`)
2. View test (`/bloodz/tests/[slug]`)
3. Click "Book Appointment"
4. BookingDialog opens:
   - Select location type (if applicable)
   - Select date
   - Select time slot
   - Confirm and pay
5. Booking confirmation

## Search Flow

1. User types in global search bar
2. Algolia search triggered (debounced)
3. Results dropdown shows:
   - Products (with "Product" badge)
   - IV Services (with "IV Service" badge)
   - Blood Tests (with "Blood Test" badge)
4. Click result → Navigate to detail page
5. Search respects location availability

## Location Flow

1. User lands on homepage
2. If no location selected → LocationGate shows blocking card
3. User clicks "Choose Location"
4. LocationDialog opens with Google Places autocomplete
5. User selects address
6. Address stored in Zustand (persisted)
7. LocationGate disappears
8. Content becomes available
9. Delivery ETAs and booking slots update based on location

