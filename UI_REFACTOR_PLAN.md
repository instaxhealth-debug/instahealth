# UI Refactor Plan - Premium Marketplace Upgrade

## Overview
Transform the MVP UI into a premium, Instashop-grade marketplace while preserving all business logic and integrations.

## Changes Summary

### 1. Header Refactor
- **Current**: Basic header with text logo
- **New**: Premium sticky header with blur, better layout (logo left, search center, actions right)
- **Files**: `components/layout/Header.tsx`

### 2. Location Selector
- **Current**: Large blocking card on homepage
- **New**: Compact banner + modal with Google Places autocomplete
- **Files**: `components/location/LocationGate.tsx`, `components/location/LocationDialog.tsx`

### 3. Category Carousel
- **Current**: Black tiles with logos
- **New**: Instashop-style chips with light backgrounds, subtle borders, hover effects
- **Files**: `components/home/CategoryCarousel.tsx`

### 4. Hero/Promo Carousel
- **Current**: Basic green gradient slabs
- **New**: Premium multi-slide carousel with gradients, proper navigation, pagination
- **Files**: `components/home/PromoBanner.tsx`

### 5. Available Now Cards
- **Current**: Basic cards
- **New**: Premium marketplace cards with better spacing, shadows, hover states
- **Files**: `components/home/AvailableNow.tsx`

### 6. Featured Sections
- **Current**: Placeholder cards
- **New**: Consistent card system with proper images, pricing, hover states
- **Files**: `components/home/FeaturedSection.tsx`, new card components

### 7. Component System
- **New Components**:
  - `ProductCard.tsx` - Standardized product card
  - `ServiceCard.tsx` - Standardized service card
  - `TestCard.tsx` - Standardized test card
  - `SectionHeader.tsx` - Consistent section headers
  - `SkeletonCard.tsx` - Loading states
  - `SearchBar.tsx` - Premium search component
  - `LocationModal.tsx` - Clean location selector

### 8. Visual Theme
- **Colors**: Soft neutrals, subtle borders, premium shadows
- **Typography**: Clear hierarchy, proper scale
- **Spacing**: 8px grid system, consistent rhythm
- **Borders**: 16-24px radius consistently
- **Shadows**: Subtle, layered shadows

### 9. UX Polish
- Skeleton loaders everywhere
- Empty states
- Hover/focus/active states
- Keyboard accessibility
- Smooth transitions
- No layout shift

## Files to Modify
1. `app/globals.css` - Theme variables
2. `tailwind.config.ts` - Extended theme
3. `components/layout/Header.tsx` - Premium header
4. `components/location/*` - Modal-based location
5. `components/home/*` - All homepage components
6. `components/pepz/*` - Product components
7. `components/ivz/*` - Service components
8. `components/bloodz/*` - Test components
9. New standardized card components

## Preserved Logic
- All Zustand stores (location, cart)
- All API integration structure
- All routing and page structure
- All business logic
