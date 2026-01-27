# Component Breakdown

## UI Components (`components/ui/`)

Base shadcn/ui components built on Radix UI primitives.

### Button (`button.tsx`)
- Variants: default, destructive, outline, secondary, ghost, link
- Sizes: default, sm, lg, icon
- Used throughout for all interactive buttons

### Input (`input.tsx`)
- Standard text input
- Used in search, forms, location selector

### Card (`card.tsx`)
- Card container with header, content, footer
- Used for product cards, service cards, cart items

### Skeleton (`skeleton.tsx`)
- Loading placeholder
- Used during data fetching

### Toast (`toast.tsx`, `toaster.tsx`)
- Notification system
- Used for cart additions, booking confirmations

## Layout Components (`components/layout/`)

### Header (`Header.tsx`)
**Purpose**: Global navigation bar

**Props**: None (uses Zustand stores)

**Features**:
- InstaHealth logo (links to homepage)
- Location selector button
- Global search bar
- Account icon (links to `/account`)
- Cart icon with item count badge (links to `/cart`)

**State**:
- Reads from `useLocationStore()` for address
- Reads from `useCartStore()` for item count

**Mobile**: Location selector moves below main nav on mobile

### LocationSelector (`location/LocationSelector.tsx`)
**Purpose**: Location picker button in header

**Props**: None

**Features**:
- Shows "Delivering to [City]" if location selected
- Shows "Select location" if not selected
- Opens LocationDialog on click

### LocationDialog (`location/LocationDialog.tsx`)
**Purpose**: Modal for address selection

**Props**:
- `open: boolean`
- `onOpenChange: (open: boolean) => void`

**Features**:
- Google Places autocomplete search
- Address suggestions dropdown
- Select address → stores in Zustand
- Closes dialog on selection

**TODO**: Integrate Google Places API

### LocationGate (`location/LocationGate.tsx`)
**Purpose**: Blocks homepage content until location selected

**Props**: None

**Features**:
- Shows blocking card if no location
- "Choose Location" button opens LocationDialog
- Disappears when location is selected

## Homepage Components (`components/home/`)

### CategoryCarousel (`CategoryCarousel.tsx`)
**Purpose**: Horizontal scrolling category tiles

**Features**:
- 8 categories: InstaPepz, InstaIVZ, InstaBloodz, Performance, Recovery, Longevity, Energy, Beauty
- Left/right scroll buttons
- Each tile links to category page
- Responsive grid

### PromoBanner (`PromoBanner.tsx`)
**Purpose**: Rotating promotional banners

**Features**:
- Auto-rotates every 5 seconds
- Manual navigation buttons
- Dot indicators
- 3 placeholder promos

### AvailableNow (`AvailableNow.tsx`)
**Purpose**: Quick access cards for each vertical

**Features**:
- 3 cards: InstaPepz delivery, InstaIVZ next slot, InstaBloodz next slot
- Shows ETA/next available time
- "Shop Now" or "Book Now" buttons
- Only shows if location is selected

### FeaturedSection (`FeaturedSection.tsx`)
**Purpose**: Featured items by vertical

**Features**:
- Featured products section
- Featured IV drips section
- Featured blood tests section
- Skeleton loaders during fetch
- Placeholder cards

## Product Components (`components/pepz/`)

### ProductGrid (`ProductGrid.tsx`)
**Purpose**: Grid of product cards

**Features**:
- Responsive grid (1/2/4 columns)
- Skeleton loaders
- Empty state
- Each card links to product detail
- Shows: image, name, description, price, compare price

**TODO**: Fetch from Shopify API

### ProductDetail (`ProductDetail.tsx`)
**Purpose**: Product detail page

**Props**:
- `slug: string`

**Features**:
- Product images (placeholder)
- Name, description, price
- Quantity selector
- Add to cart button
- Buy now button (redirects to checkout)
- Delivery ETA card (if location selected)
- Prescription warning (if applicable)
- Skeleton loader during fetch

**State**:
- Reads from `useCartStore()` for add to cart
- Reads from `useLocationStore()` for delivery ETA

## Service Components (`components/ivz/`)

### ServiceGrid (`ServiceGrid.tsx`)
**Purpose**: Grid of IV service cards

**Features**:
- Responsive grid (1/2/3 columns)
- Skeleton loaders
- Empty state
- Each card links to service detail
- Shows: image, name, description, price, duration

**TODO**: Fetch from booking API

### ServiceDetail (`ServiceDetail.tsx`)
**Purpose**: Service detail page

**Props**:
- `slug: string`

**Features**:
- Service image (placeholder)
- Name, description, price
- Duration and deposit info
- Benefits list (if available)
- Prescription warning (if applicable)
- "Book Appointment" button opens BookingDialog
- Skeleton loader during fetch

**State**:
- Reads from `useLocationStore()` for location check

## Test Components (`components/bloodz/`)

### TestGrid (`TestGrid.tsx`)
**Purpose**: Grid of blood test cards

**Features**:
- Responsive grid (1/2/3 columns)
- Skeleton loaders
- Empty state
- Each card links to test detail
- Shows: image, name, description, price, duration

**TODO**: Fetch from booking API

### TestDetail (`TestDetail.tsx`)
**Purpose**: Test detail page

**Props**:
- `slug: string`

**Features**:
- Test image (placeholder)
- Name, description, price
- Duration info
- At-home vs clinic indicator
- Test markers list (if available)
- Prescription warning (if applicable)
- "Book Appointment" button opens BookingDialog
- Skeleton loader during fetch

**State**:
- Reads from `useLocationStore()` for location check

## Booking Components (`components/booking/`)

### BookingDialog (`BookingDialog.tsx`)
**Purpose**: Multi-step booking flow modal

**Props**:
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `item: IVService | BloodTest`
- `itemType: "service" | "test"`

**Features**:
- Step 1: Date selection (placeholder date picker)
- Step 2: Time slot selection
  - Fetches available slots from booking API
  - Shows loading state
  - Empty state if no slots
- Step 3: Payment & confirmation
  - Shows booking summary
  - Total price
  - Confirm & Pay button
- Back buttons between steps
- Closes on completion

**State**:
- `selectedDate: Date | null`
- `selectedSlot: BookingSlot | null`
- `availableSlots: BookingSlot[]`
- `step: "date" | "time" | "payment"`

**TODO**: 
- Integrate date picker component
- Integrate booking API
- Integrate Stripe payment

## Cart Components (`components/cart/`)

### CartView (`CartView.tsx`)
**Purpose**: Shopping cart interface

**Features**:
- Empty state with "Continue Shopping" button
- Location gate (if no location selected)
- Cart items list:
  - Product image (placeholder)
  - Name and price
  - Quantity controls (+/-)
  - Remove button
  - Line total
- Order summary sidebar:
  - Subtotal
  - Shipping (calculated at checkout)
  - Total
  - "Proceed to Checkout" button
  - "Continue Shopping" button

**State**:
- Reads from `useCartStore()` for items and totals
- Reads from `useLocationStore()` for location check

## Search Components (`components/search/`)

### GlobalSearch (`GlobalSearch.tsx`)
**Purpose**: Global search bar with dropdown results

**Features**:
- Search input with icon
- Clear button (X) when query exists
- Dropdown results panel:
  - Loading state
  - Results list with type badges
  - Empty state
  - Click result → navigate to detail page
- Closes on outside click
- Debounced search (300ms)

**State**:
- `query: string`
- `isOpen: boolean`
- `results: SearchResult[]`
- `isLoading: boolean`

**TODO**: Integrate Algolia search API

## State Management

### Location Store (`lib/store/location-store.ts`)
- `address: Address | null`
- `isSelected: boolean`
- `setAddress(address)`
- `clearAddress()`
- Persisted to localStorage

### Cart Store (`lib/store/cart-store.ts`)
- `items: CartItem[]`
- `addItem(product, variantId, quantity)`
- `removeItem(productId, variantId)`
- `updateQuantity(productId, variantId, quantity)`
- `clearCart()`
- `getTotalItems()`
- `getTotalPrice()`
- Persisted to localStorage

## API Integration Points

### Shopify (`lib/api/shopify.ts`)
- `getProducts()` - Used in ProductGrid
- `getProductByHandle()` - Used in ProductDetail
- `createCheckout()` - Used in CheckoutPage

### Booking (`lib/api/booking.ts`)
- `getServices()` - Used in ServiceGrid
- `getServiceBySlug()` - Used in ServiceDetail
- `getTests()` - Used in TestGrid
- `getTestBySlug()` - Used in TestDetail
- `bookingProvider.getAvailableSlots()` - Used in BookingDialog
- `bookingProvider.createBooking()` - Used in BookingDialog

### Search (`lib/api/search.ts`)
- `searchItems()` - Used in GlobalSearch

### Location (`lib/api/location.ts`)
- `getPlaceSuggestions()` - Used in LocationDialog
- `getPlaceDetails()` - Used in LocationDialog

