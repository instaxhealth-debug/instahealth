import { prisma } from './prisma';

/**
 * Get or create a cart for a user
 */
export async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          cart: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
      },
      include: {
        items: {
          include: {
            cart: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  }

  return cart;
}

/**
 * Add item to cart (or update quantity if exists)
 * FIX: Now requires vendorId (schema change)
 */
export async function addToCart(userId: string, productId: string, quantity: number = 1, variantId?: string | null) {
  const cart = await getOrCreateCart(userId);

  // FIX: Fetch product to get vendorId - MUST check vendor status
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      vendor: {
        status: "active",
      },
    },
    select: {
      id: true,
      vendorId: true,
      active: true,
      published: true,
    },
  });

  if (!product || !product.active || !product.published) {
    throw new Error(`Product ${productId} not available`);
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      variantId: variantId ?? null,
    },
  });

  if (existingItem) {
    return await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    });
  }

  return await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      vendorId: product.vendorId, // FIX: Include vendorId
      variantId: variantId ?? null,
      quantity,
      unitPriceFils: 0, // Will be updated by caller or set from product
    },
  });
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  if (quantity <= 0) {
    return await prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  return await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });
}

/**
 * Remove item from cart
 */
export async function removeFromCart(cartItemId: string) {
  return await prisma.cartItem.delete({
    where: { id: cartItemId },
  });
}

/**
 * Get cart with products and calculate total
 * FIX: Now includes vendor data and uses unitPriceFils from cart for price snapshot
 */
export async function getCartWithProducts(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              vendor: true,
            },
          },
          vendor: true, // FIX: Include vendor relation
          variant: true, // FIX: Include variant relation directly
        },
      },
    },
  });

  if (!cart) {
    return null;
  }

  // Filter out ghost items (items with null product or invalid variant)
  // ALSO filter out items from inactive vendors
  const validItems = cart.items.filter((item: any) => {
    const isGhost = !item.product || (item.variantId && !item.variant);
    const vendorInactive = item.product?.vendor?.status !== "active";

    if (isGhost) {
      console.warn(`[getCartWithProducts] Ghost item detected:`, { itemId: item.id, productId: item.productId, variantId: item.variantId });
    }
    if (vendorInactive) {
      console.warn(`[getCartWithProducts] Inactive vendor product in cart:`, { itemId: item.id, productId: item.productId, vendorId: item.vendorId });
    }

    return !isGhost && !vendorInactive;
  });

  // Calculate totals in fils using unitPriceFils (price snapshot from cart item)
  const subtotalFils = validItems.reduce((sum: number, item: any) => {
    // Use unitPriceFils from cart item (snapshot at time of add)
    return sum + item.unitPriceFils * item.quantity;
  }, 0);

  return {
    cart,
    items: validItems,
    subtotalFils,
    totalFils: subtotalFils, // Add delivery logic later
  };
}

/**
 * Clear all items from cart
 */
export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) return;

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });
}
