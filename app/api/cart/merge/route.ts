import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface GuestCartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPriceFils: number;
}

export async function POST(req: NextRequest) {
  const DEBUG = process.env.DEBUG_CART === "true";
  
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { guestCartItems } = await req.json();

    if (!Array.isArray(guestCartItems)) {
      return NextResponse.json(
        { error: "guestCartItems must be an array" },
        { status: 400 }
      );
    }

    if (DEBUG) console.log("[API:CART:MERGE] Starting merge for user:", session.user.id, "items:", guestCartItems.length);

    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id,
          status: "ACTIVE",
        },
        include: { items: true },
      });
      if (DEBUG) console.log("[API:CART:MERGE] Created new cart:", cart.id);
    }

    // CLEANUP: Delete ghost items from existing cart (items with invalid product/variant refs)
    const ghostItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true, variant: true },
    });
    
    let deletedGhostCount = 0;
    for (const item of ghostItems) {
      const isGhost = !item.product || (item.variantId && !item.variant);
      if (isGhost) {
        await prisma.cartItem.delete({ where: { id: item.id } });
        deletedGhostCount++;
        if (DEBUG) console.log("[API:CART:MERGE] Deleted ghost item:", { itemId: item.id, productId: item.productId, variantId: item.variantId });
      }
    }
    if (DEBUG && deletedGhostCount > 0) {
      console.log("[API:CART:MERGE] Cleaned up", deletedGhostCount, "ghost items from cart");
    }

    // MERGE: Validate and merge guest cart items into user cart
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const guestItem of guestCartItems) {
      // Normalize variantId: convert undefined/empty string -> null
      const normalizedVariantId = guestItem.variantId && guestItem.variantId.trim() !== "" 
        ? guestItem.variantId 
        : null;

      if (DEBUG) console.log("[API:CART:MERGE] Processing item:", { productId: guestItem.productId, variantId: normalizedVariantId });

      // VALIDATION: Check if product exists and get vendorId
      const product = await prisma.product.findUnique({
        where: { id: guestItem.productId },
        select: { id: true, vendorId: true },
      });

      if (!product) {
        skippedCount++;
        if (DEBUG) console.log("[API:CART:MERGE] ✗ Skipped invalid productId:", guestItem.productId);
        continue;
      }

      const vendorId = product.vendorId;

      // VALIDATION: If variantId provided, check if it exists and belongs to this product
      let validatedVariantId = normalizedVariantId;
      if (normalizedVariantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: normalizedVariantId },
        });

        if (!variant) {
          // Variant doesn't exist - set to null and continue
          validatedVariantId = null;
          if (DEBUG) console.log("[API:CART:MERGE] ⚠️  variantId not found, setting to null:", normalizedVariantId);
        } else if (variant.productId !== guestItem.productId) {
          // Variant exists but doesn't belong to this product - set to null
          validatedVariantId = null;
          if (DEBUG) console.log("[API:CART:MERGE] ⚠️  variantId doesn't belong to product, setting to null:", { variantId: normalizedVariantId, expectedProduct: guestItem.productId, actualProduct: variant.productId });
        }
      }

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: guestItem.productId,
          variantId: validatedVariantId,
        },
      });

      if (existingItem) {
        // Add quantities together
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + guestItem.quantity },
        });
        updatedCount++;
        if (DEBUG) console.log("[API:CART:MERGE] ✓ Updated existing item:", { itemId: existingItem.id, newQty: existingItem.quantity + guestItem.quantity });
      } else {
        // Add new item (with validated variantId and vendorId)
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: guestItem.productId,
            vendorId, // FIX: Store vendorId from product
            variantId: validatedVariantId,
            quantity: guestItem.quantity,
            unitPriceFils: guestItem.unitPriceFils,
          },
        });
        createdCount++;
        if (DEBUG) console.log("[API:CART:MERGE] ✓ Created new item:", { productId: guestItem.productId, vendorId, variantId: validatedVariantId });
      }
    }

    if (DEBUG) {
      console.log("[API:CART:MERGE] ✓ Merge complete:", { 
        created: createdCount, 
        updated: updatedCount, 
        skipped: skippedCount,
        deletedGhosts: deletedGhostCount 
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Cart merged successfully",
        cart: updatedCart,
        summary: DEBUG ? { created: createdCount, updated: updatedCount, skipped: skippedCount, deletedGhosts: deletedGhostCount } : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CART MERGE]", error);
    return NextResponse.json(
      { error: "Failed to merge cart" },
      { status: 500 }
    );
  }
}
