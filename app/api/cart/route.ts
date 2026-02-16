import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logMarketplaceEvent } from "@/lib/marketplace-events";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const DEBUG = process.env.DEBUG_CART === "true";
  try {
    const session = await auth();

    if (DEBUG) console.log("[API:CART:GET] Session:", { userId: session?.user?.id, email: session?.user?.email });

    if (!session?.user?.id) {
      if (DEBUG) console.log("[API:CART:GET] ✗ Unauthorized - no session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: {
                  select: {
                    status: true,
                  },
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      if (DEBUG) console.log("[API:CART:GET] ✗ Cart not found for user:", session.user.id);
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      );
    }

    if (DEBUG) console.log("[API:CART:GET] Cart identity:", { userId: cart.userId, cartId: cart.id, locationId: cart.locationId, status: cart.status, totalItems: cart.items.length });

    // FIX: Filter out ghost items AND inactive vendor items
    const validItems = cart.items.filter((item: any) => {
      const isGhost = !item.product || (item.variantId && !item.variant);
      const vendorInactive = item.product?.vendor?.status !== "active";

      if (isGhost && DEBUG) {
        console.log("[API:CART:GET] Dropped ghost item:", { itemId: item.id, productId: item.productId, variantId: item.variantId });
      }
      if (vendorInactive && DEBUG) {
        console.log("[API:CART:GET] Dropped inactive vendor item:", { itemId: item.id, productId: item.productId, vendorId: item.vendorId });
      }

      return !isGhost && !vendorInactive;
    });

    const droppedGhostItems = cart.items.length - validItems.length;
    if (DEBUG) {
      console.log("[API:CART:GET] Ghost item analysis:", { total: cart.items.length, valid: validItems.length, droppedGhostItems });
      if (droppedGhostItems > 0) {
        console.warn("[API:CART:GET] ⚠️  WARNING: Dropped", droppedGhostItems, "ghost items from response (client may have stale cache)");
      }
    }

    return NextResponse.json({ ...cart, items: validItems });
  } catch (error) {
    console.error("[CART GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const DEBUG = process.env.DEBUG_CART === "true";
  try {
    const session = await auth();

    if (DEBUG) console.log("[API:CART:POST] Session:", session?.user?.email ? "✓ Authenticated" : "✗ No session");

    if (!session?.user?.id) {
      if (DEBUG) console.log("[API:CART:POST] ✗ Rejected: No authenticated session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId, variantId, quantity, action } = await req.json();
    // FIX: Normalize variantId to undefined (not null) for consistency
    const normalizedVariantId = variantId === undefined || variantId === null || variantId === "" ? undefined : variantId;
    
    if (DEBUG) console.log("[API:CART:POST] Request:", { userId: session.user.id, productId, normalizedVariantId, quantity, action });

    if (!productId) {
      if (DEBUG) console.log("[API:CART:POST] ✗ Validation failed: productId missing");
      return NextResponse.json(
        { error: "productId is required", code: "INVALID_PRODUCT" },
        { status: 400 }
      );
    }
    
    let validatedProduct: { id: string; vendorId: string } | null = null;

    // FIX: Validate product exists AND vendor is active before attempting add/update
    if (action !== "remove") {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          vendor: {
            status: "active",
          },
        },
      });
      if (!product) {
        if (DEBUG) console.log("[API:CART:POST] ✗ Validation failed: product not found or vendor inactive", productId);
        return NextResponse.json(
          { error: "Product not available", code: "INVALID_PRODUCT" },
          { status: 400 }
        );
      }

      validatedProduct = { id: product.id, vendorId: product.vendorId };
      
      // FIX: If variantId provided, validate it exists and belongs to this product
      if (normalizedVariantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: normalizedVariantId } });
        if (!variant || variant.productId !== productId) {
          if (DEBUG) console.log("[API:CART:POST] ✗ Validation failed: variant not found or doesn't belong to product", { variantId: normalizedVariantId, productId });
          return NextResponse.json(
            { error: "Variant not found or invalid", code: "INVALID_VARIANT" },
            { status: 400 }
          );
        }
      }
    }

    if (action !== "remove" && quantity === undefined) {
      if (DEBUG) console.log("[API:CART:POST] ✗ Validation failed: quantity required for action", action);
      return NextResponse.json(
        { error: "quantity is required for add/update actions" },
        { status: 400 }
      );
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: true },
    });

    if (!cart) {
      if (DEBUG) console.log("[API:CART:POST] Creating new cart for user:", session.user.id);
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id,
          status: "ACTIVE",
        },
        include: { items: true },
      });
      if (DEBUG) console.log("[API:CART:POST] ✓ Cart created:", cart.id);
    } else {
      if (DEBUG) console.log("[API:CART:POST] ✓ Found existing cart:", cart.id, "items:", cart.items.length);
    }

    if (action === "remove") {
      // FIX: Use null consistently for variantId in queries (schema stores null, not undefined)
      const deleted = await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId,
          variantId: normalizedVariantId ?? null,
        },
      });
      if (DEBUG) console.log("[API:CART:POST] Removed items:", deleted.count);
    } else if (action === "update") {
      // Update quantity (or remove if quantity <= 0)
      if (quantity <= 0) {
        const deleted = await prisma.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            productId,
            variantId: normalizedVariantId ?? null,
          },
        });
        if (DEBUG) console.log("[API:CART:POST] Deleted (qty<=0):", deleted.count);
      } else {
        const updated = await prisma.cartItem.updateMany({
          where: {
            cartId: cart.id,
            productId,
            variantId: normalizedVariantId ?? null,
          },
          data: { quantity },
        });
        if (DEBUG) console.log("[API:CART:POST] Updated qty:", updated.count);
      }
    } else {
      // action === "add" or default (add/merge behavior)
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
          variantId: normalizedVariantId ?? null,
        },
      });

      if (existingItem) {
        // Merge with existing: add to quantity
        if (DEBUG) console.log("[API:CART:POST] Merging with existing item:", existingItem.id, "qty+", quantity);
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        });
      } else {
        // Fetch product to store price snapshot (already validated above with vendor status)
        const product = await prisma.product.findFirst({
          where: {
            id: productId,
            vendor: {
              status: "active",
            },
          },
          include: { variants: true },
        });

        if (!product) {
          if (DEBUG) console.log("[API:CART:POST] ✗ Product not found or vendor inactive during create:", productId);
          return NextResponse.json(
            { error: "Product not available", code: "INVALID_PRODUCT" },
            { status: 400 }
          );
        }

        const variant = normalizedVariantId
          ? product.variants.find((v) => v.id === normalizedVariantId)
          : null;

        if (DEBUG) console.log("[API:CART:POST] Creating new item:", { productId, vendorId: product.vendorId, variantId: normalizedVariantId, qty: quantity });
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            vendorId: product.vendorId, // FIX: Store vendorId for correct checkout flow
            variantId: normalizedVariantId ?? null,
            quantity,
            unitPriceFils: variant?.priceFils || product.priceFils || 0,
          },
        });
      }
    }

    if (action === "add" && validatedProduct) {
      try {
        await logMarketplaceEvent({
          productId: validatedProduct.id,
          vendorId: validatedProduct.vendorId,
          eventType: "ADD_TO_CART",
        });
      } catch (error) {
        console.error("[API:CART:POST] Failed to log add-to-cart event", error);
      }
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: {
                  select: {
                    status: true,
                  },
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (DEBUG) {
      console.log("[API:CART:POST] ✓ Operation complete:", { 
        action, 
        cartId: updatedCart?.id, 
        itemCount: updatedCart?.items.length,
        userId: session.user.id,
        locationId: updatedCart?.locationId,
        items: updatedCart?.items.map(i => ({ 
          id: i.id, 
          productId: i.productId, 
          variantId: i.variantId, 
          qty: i.quantity,
          hasProduct: !!i.product,
          hasVariant: i.variantId ? !!i.variant : 'N/A'
        }))
      });
    }
    return NextResponse.json(updatedCart);
  } catch (error) {
    console.error("[CART POST]", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}
