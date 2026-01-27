# InstaHealth

A production-ready health marketplace frontend inspired by Instashop's UX, built with Next.js 14.

## Features

- 🏪 **Multi-vertical marketplace**: Products, IV services, and blood tests in one platform
- 📍 **Location-based**: Delivery and service availability based on location
- 🔍 **Global search**: Search across all verticals with Algolia
- 🛒 **Shopify integration**: Headless e-commerce for physical products
- 📅 **Booking system**: Abstracted booking provider for services and tests
- 💳 **Dual payment**: Shopify checkout for products, Stripe for bookings
- 📱 **Mobile-first**: Responsive design with Tailwind CSS
- ⚡ **Fast**: Optimized with Next.js App Router and skeleton loaders

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create `.env.local`):
```env
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-token
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## Key Components

- **Header**: Global navigation with location, search, cart
- **Homepage**: Category carousel, promos, featured items
- **Product Pages**: Shopify-powered product listings and details
- **Service Pages**: IV drip service listings and booking
- **Test Pages**: Blood test listings and booking
- **Cart**: Shopping cart for products (separate from bookings)

## API Integrations

### Shopify (Products)
- Storefront API for products and checkout
- Headless implementation

### Booking System
- Abstracted interface for Acuity/Calendly/custom
- See `lib/api/booking.ts`

### Algolia (Search)
- Global search across all item types
- Location-based filtering

### Google Places (Location)
- Address autocomplete
- Geocoding

## Development

### Adding a New Component

1. Create component in `components/`
2. Use shadcn/ui primitives from `components/ui/`
3. Follow existing patterns for consistency

### Adding a New Page

1. Create page in `app/` directory
2. Use App Router conventions
3. Add to site map in ARCHITECTURE.md

### Styling

- Use Tailwind CSS utility classes
- Follow design system in `tailwind.config.ts`
- Use shadcn/ui components for consistency

## Build

```bash
npm run build
```

## Deployment

Recommended platform: Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

## License

Proprietary - All rights reserved

