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
    }

    // Merge guest cart items into user cart
    for (const guestItem of guestCartItems) {
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId || null,
        },
      });

      if (existingItem) {
        // Add quantities together
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + guestItem.quantity },
        });
      } else {
        // Add new item
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: guestItem.productId,
            variantId: guestItem.variantId || null,
            quantity: guestItem.quantity,
            unitPriceFils: guestItem.unitPriceFils,
          },
        });
      }
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
