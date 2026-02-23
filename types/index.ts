// Core Data Models

export type Vertical = "pepz" | "ivz" | "bloodz";

export type ItemType = "product" | "service" | "test";

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  addresses: Address[];
  defaultAddressId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  vertical: Vertical;
  parentId?: string;
  order: number;
}

export interface BaseItem {
  id: string;
  type: ItemType;
  vertical: Vertical;
  name: string;
  slug: string;
  description: string;
  image: string;
  images?: string[];
  categoryId: string;
  category?: Category;
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product extends BaseItem {
  type: "product";
  vertical: "pepz";
  price: number;
  compareAtPrice?: number;
  currency: string;
  inventoryQuantity?: number;
  sku?: string;
  weight?: number;
  requiresPrescription?: boolean;
}

export interface IVService extends BaseItem {
  type: "service";
  vertical: "ivz";
  duration: number; // minutes
  price: number;
  currency: string;
  deposit?: number;
  description: string;
  benefits?: string[];
  ingredients?: string[];
  requiresPrescription?: boolean;
}

export interface BloodTest extends BaseItem {
  type: "test";
  vertical: "bloodz";
  price: number;
  currency: string;
  duration: number; // minutes
  description: string;
  markers?: string[];
  requiresPrescription?: boolean;
  canBeAtHome?: boolean;
}

export type Item = Product | IVService | BloodTest;

export interface BookingSlot {
  id: string;
  itemId: string;
  itemType: "service" | "test";
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  type: "product";
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  userId: string;
  type: "service" | "test";
  itemId: string;
  item: IVService | BloodTest;
  slot: BookingSlot;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  amount: number;
  deposit?: number;
  currency: string;
  address?: Address;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  image?: string;
  type: "banner" | "discount" | "free_shipping";
  vertical?: Vertical;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface SearchResult {
  item: Item;
  type: ItemType;
  vertical: Vertical;
  relevance: number;
}

export interface LocationState {
  address: Address | null;
  isSelected: boolean;
}

