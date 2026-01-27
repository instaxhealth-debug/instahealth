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
 */
export async function addToCart(userId: string, productId: string, quantity: number = 1, variantId?: string | null) {
  const cart = await getOrCreateCart(userId);

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
      variantId: variantId ?? null,
      quantity,
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
 */
export async function getCartWithProducts(userId: string) {
  const cart = await prisma.cart.findUnique({
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
    return null;
  }

  // Get product details for each item
  const itemsWithProducts = await Promise.all(
    cart.items.map(async (item: any) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          vendor: true,
          variants: item.variantId
            ? {
                where: { id: item.variantId },
              }
            : false,
        },
      });

      // Get variant if present
      const variant = item.variantId && product?.variants?.[0]
        ? product.variants[0]
        : null;

      return {
        ...item,
        product,
        variant,
      };
    })
  );

  // Calculate totals in fils (use variant price if available)
  const subtotalFils = itemsWithProducts.reduce((sum: number, item: any) => {
    if (!item.product) return sum;
    const priceFils = item.variant?.priceFils || item.product.priceFils;
    return sum + priceFils * item.quantity;
  }, 0);

  return {
    cart,
    items: itemsWithProducts,
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
