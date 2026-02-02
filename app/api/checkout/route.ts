import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getCartWithProducts, clearCart } from '@/lib/cart';
import { assertAddressInVendorRadius } from '@/server/services/geo';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      addressId, // Saved address ID
      placeId,   // One-time place ID (if not using saved address)
      locationId,
      shippingName,
      shippingPhone,
      shippingAddressLine1,
      shippingAddressLine2,
      shippingNotes,
      ageConfirmed,
      acceptedTerms,
      acceptedDisclaimer,
    } = body;

    // Validate required fields
    if (!locationId || !shippingName || !shippingPhone || !shippingAddressLine1) {
      return NextResponse.json(
        { error: 'Missing required fields: locationId, shippingName, shippingPhone, shippingAddressLine1' },
        { status: 400 }
      );
    }

    if (!ageConfirmed || !acceptedTerms || !acceptedDisclaimer) {
      return NextResponse.json(
        { error: 'You must confirm age, accept terms, and accept the disclaimer to checkout.' },
        { status: 400 }
      );
    }

    // Resolve delivery address for geo validation
    let deliveryLat: number;
    let deliveryLng: number;

    if (addressId) {
      // Use saved address
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId: user.id, // Ensure user owns this address
        },
      });

      if (!address) {
        return NextResponse.json(
          { error: 'Address not found or unauthorized' },
          { status: 404 }
        );
      }

      deliveryLat = address.lat;
      deliveryLng = address.lng;
    } else if (placeId) {
      // Resolve one-time place ID server-side
      const resolveResponse = await fetch(
        `${process.env.NEXTAUTH_URL}/api/geo/resolve-place`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId }),
        }
      );

      if (!resolveResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to resolve delivery address' },
          { status: 400 }
        );
      }

      const placeData = await resolveResponse.json();
      deliveryLat = placeData.lat;
      deliveryLng = placeData.lng;
    } else {
      return NextResponse.json(
        { error: 'Either addressId or placeId is required for delivery address validation' },
        { status: 400 }
      );
    }

    // Get cart with products
    const cartData = await getCartWithProducts(user.id);
    if (!cartData || cartData.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const { items, subtotalFils, totalFils } = cartData;

    // Validate all products exist and are in stock
    for (const item of items) {
      if (!item.product) {
        return NextResponse.json(
          { error: `Product not found for cart item ${item.id}` },
          { status: 400 }
        );
      }

      // Check if product has variants - if so, variantId must be present
      const productVariants = await prisma.productVariant.findMany({
        where: { productId: item.productId, active: true },
      });

      if (productVariants.length > 0 && !item.variantId) {
        return NextResponse.json(
          { error: `Product "${item.product.name}" requires a variant selection` },
          { status: 400 }
        );
      }

      // Validate variant if present
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!variant || !variant.active || !variant.inStock) {
          return NextResponse.json(
            { error: `Selected variant for "${item.product.name}" is not available` },
            { status: 400 }
          );
        }
      }

      if (!item.product.active || (!item.variant && !item.product.inStock)) {
        return NextResponse.json(
          { error: `Product "${item.product.name}" is not available` },
          { status: 400 }
        );
      }
    }

    // CRITICAL: Enforce vendor service radius before creating order
    // Group cart items by vendor
    const vendorIds = Array.from(new Set(items.map((item: any) => item.product!.vendorId)));
    
    for (const vendorId of vendorIds) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: {
          id: true,
          name: true,
          enforceServiceRadius: true,
          baseLat: true,
          baseLng: true,
          serviceRadiusKm: true,
          allowOutOfRadiusOverride: true,
        },
      });

      if (!vendor) {
        return NextResponse.json(
          { error: `Vendor not found: ${vendorId}` },
          { status: 400 }
        );
      }

      try {
        assertAddressInVendorRadius({
          vendor,
          addressLat: deliveryLat,
          addressLng: deliveryLng,
          isAdminOverride: false, // Regular checkout, no admin override
        });
      } catch (geoError: any) {
        // Return geo validation error to client
        return NextResponse.json(
          {
            ok: false,
            error: geoError.message || 'Address not serviceable by vendor',
            code: geoError.code,
            vendorId: vendor.id,
            vendorName: vendor.name,
            distanceKm: geoError.distanceKm,
            radiusKm: geoError.radiusKm,
          },
          { status: 400 }
        );
      }
    }

    // Create Order with PENDING_PAYMENT status
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        locationId,
        status: 'PENDING_PAYMENT',
        subtotalFils,
        deliveryFils: 0,
        totalFils,
        currency: 'AED',
        shippingName,
        shippingPhone,
        shippingAddressLine1,
        shippingAddressLine2,
        shippingNotes,
        ageConfirmed: Boolean(ageConfirmed),
        acceptedTerms: Boolean(acceptedTerms),
        acceptedDisclaimer: Boolean(acceptedDisclaimer),
        items: {
          create: await Promise.all(
            items.map(async (item: any) => {
              const variant = item.variantId
                ? await prisma.productVariant.findUnique({
                    where: { id: item.variantId },
                  })
                : null;

              const priceFils = variant?.priceFils || item.product!.priceFils;
              const lineTotalFils = priceFils * item.quantity;

              return {
                productId: item.productId,
                vendorId: item.product!.vendorId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                unitPriceFils: priceFils,
                lineTotalFils,
                // Snapshot fields - preserve order data
                productName: item.product!.name,
                productSlug: item.product!.slug,
                vendorName: item.product!.vendor.name,
                variantSku: variant?.sku || null,
                variantStrength: variant?.strength || null,
                variantUnitSize: variant?.unitSize || null,
              };
            })
          ),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Create Stripe Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: order.id,
      line_items: order.items.map((item: any) => ({
        price_data: {
          currency: 'aed',
          unit_amount: item.unitPriceFils, // Already uses variant price if present (from order creation above)
          product_data: {
            name: item.productName + (item.variantStrength ? ` (${item.variantStrength})` : ''),
            description: item.product.description || undefined,
            images: item.product.imageUrl ? [item.product.imageUrl] : undefined,
          },
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/cancel`,
      metadata: {
        orderId: order.id,
      },
    });

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: stripeSession.id },
    });

    // Clear cart after successful checkout session creation
    await clearCart(user.id);

    return NextResponse.json({
      sessionId: stripeSession.id,
      url: stripeSession.url,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
