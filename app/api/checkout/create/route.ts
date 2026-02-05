import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartWithProducts } from "@/lib/cart";
import { buildShippingPayload } from "@/lib/checkout/buildShippingPayload";
import { createVendorOrders } from "@/lib/fulfillment/vendor-orders";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const DEBUG = process.env.DEBUG_CHECKOUT === "true";
  
  try {
    const session = await auth();
    if (DEBUG) console.log("[CHECKOUT:CREATE] Session:", session?.user?.email ? "✓ Authenticated" : "✗ No session");
    
    if (!session?.user?.email) {
      if (DEBUG) console.log("[CHECKOUT:CREATE] Rejected: No authenticated session");
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true },
    });

    if (!user) {
      if (DEBUG) console.log("[CHECKOUT:CREATE] Rejected: User not found for email", session.user.email);
      return NextResponse.json({ error: "User not found", code: "USER_NOT_FOUND" }, { status: 404 });
    }

    if (DEBUG) console.log("[CHECKOUT:CREATE] User ID:", user.id);

    const body = await req.json();
    if (DEBUG) console.log("[CHECKOUT:CREATE] Request body keys:", Object.keys(body));
    
    const {
      addressId,
      addressPayload,
      shippingName,
      shippingPhone,
      shippingAddressLine1,
      shippingAddressLine2,
      shippingArea,
      shippingEmirate,
      shippingNotes,
      acceptedTerms,
      acceptedDisclaimer,
    } = body;

    if (DEBUG) {
      console.log("[CHECKOUT:CREATE] Shipping data:", {
        name: shippingName ? "✓" : "✗",
        phone: shippingPhone ? "✓" : "✗",
        line1: shippingAddressLine1 ? "✓" : "✗",
        addressId: addressId ? "✓" : "✗",
        terms: acceptedTerms ? "✓" : "✗",
        disclaimer: acceptedDisclaimer ? "✓" : "✗",
      });
    }

    if (!acceptedTerms || !acceptedDisclaimer) {
      if (DEBUG) console.log("[CHECKOUT:CREATE] Rejected: Not accepted terms or disclaimer");
      return NextResponse.json(
        { error: "You must accept the terms and product disclaimer", code: "TERMS_NOT_ACCEPTED" },
        { status: 400 }
      );
    }

    let address = null;
    if (addressId) {
      address = await prisma.address.findFirst({
        where: { id: addressId, userId: user.id },
      });
      if (!address) {
        if (DEBUG) console.log("[CHECKOUT:CREATE] Rejected: Address not found for ID", addressId);
        return NextResponse.json(
          { error: "Address not found", code: "ADDRESS_NOT_FOUND" },
          { status: 400 }
        );
      }
      if (DEBUG) console.log("[CHECKOUT:CREATE] ✓ Found saved address:", address.id);
    } else if (addressPayload) {
      const {
        label,
        phone,
        line1,
        line2,
        area,
        city,
        emirate,
        instructions,
        lat,
        lng,
        placeId,
        formattedAddress,
        isDefault,
      } = addressPayload;

      if (DEBUG) {
        console.log("[CHECKOUT:CREATE] Address payload validation:", {
          label: label ? "✓" : "✗",
          line1: line1 ? "✓" : "✗",
          city: city ? "✓" : "✗",
          lat: typeof lat === "number" ? "✓" : "✗",
          lng: typeof lng === "number" ? "✓" : "✗",
          placeId: placeId ? "✓" : "✗",
        });
      }

      if (!label || !line1 || !city || typeof lat !== "number" || typeof lng !== "number" || !placeId) {
        if (DEBUG) console.log("[CHECKOUT:CREATE] Rejected: Invalid address payload");
        return NextResponse.json(
          { error: "Invalid address payload", code: "INVALID_ADDRESS" },
          { status: 400 }
        );
      }

      const normalizedHash = crypto
        .createHash("md5")
        .update(`${lat.toFixed(6)},${lng.toFixed(6)}`)
        .digest("hex");

      if (isDefault) {
        await prisma.address.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        });
      }

      address = await prisma.address.create({
        data: {
          userId: user.id,
          label: String(label).trim(),
          phone: phone?.trim() || null,
          line1: String(line1).trim(),
          line2: line2?.trim() || null,
          area: area?.trim() || null,
          city: String(city).trim(),
          emirate: emirate?.trim() || null,
          country: "United Arab Emirates",
          instructions: instructions?.trim() || null,
          lat,
          lng,
          placeId,
          formattedAddress: formattedAddress || "",
          isDefault: Boolean(isDefault),
          normalizedHash,
        },
      });
      if (DEBUG) console.log("[CHECKOUT:CREATE] ✓ Created new address:", address.id);
    } else {
      if (DEBUG) console.log("[CHECKOUT:CREATE] Rejected: No address provided");
      return NextResponse.json(
        { error: "Delivery address is required", code: "ADDRESS_REQUIRED" },
        { status: 400 }
      );
    }

    const shipping = buildShippingPayload({
      shippingName: shippingName || user.name || "",
      shippingPhone: shippingPhone || "",
      shippingAddressLine1,
      shippingAddressLine2,
      selectedAddress: address,
    });

    if (DEBUG) {
      console.log("[CHECKOUT:CREATE] Shipping payload:", {
        name: shipping.shippingName || "✗ MISSING",
        phone: shipping.shippingPhone || "✗ MISSING",
        line1: shipping.shippingAddressLine1 || "✗ MISSING",
        area: shipping.shippingArea || "(not set)",
        emirate: shipping.shippingEmirate || "(not set)",
      });
    }

    if (!shipping.shippingName || !shipping.shippingPhone || !shipping.shippingAddressLine1) {
      if (DEBUG) console.log("[CHECKOUT:CREATE] Rejected: Missing shipping fields after buildPayload");
      return NextResponse.json(
        { error: "Missing required fields: name, phone, address", code: "INCOMPLETE_SHIPPING" },
        { status: 400 }
      );
    }

    const cartData = await getCartWithProducts(user.id);
    if (DEBUG) {
      console.log("[CHECKOUT:CREATE] Cart data retrieved:", {
        found: !!cartData,
        itemCount: cartData?.items.length || 0,
        totalFils: cartData?.totalFils || 0,
      });
    }
    
    // FIX: Ensure cart has items before proceeding
    if (!cartData || cartData.items.length === 0) {
      if (DEBUG) {
        // Debug: Check if cart exists in DB
        const dbCart = await prisma.cart.findUnique({
          where: { userId: user.id },
          include: { items: true },
        });
        console.log("[CHECKOUT:CREATE] DB Cart check:", {
          exists: !!dbCart,
          items: dbCart?.items.length || 0,
        });
      }
      console.log("[CHECKOUT:CREATE] ✗ Rejected: Cart is empty");
      return NextResponse.json({ error: "Cart is empty", code: "EMPTY_CART" }, { status: 400 });
    }

    const { items, subtotalFils, totalFils } = cartData;
    if (DEBUG) console.log("[CHECKOUT:CREATE] ✓ Cart has", items.length, "items, total:", totalFils, "fils");

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        locationId: null,
        addressId: address?.id || null,
        status: "PENDING_PAYMENT",
        subtotalFils,
        deliveryFils: 0,
        totalFils,
        currency: "AED",
        shippingName: shipping.shippingName,
        shippingPhone: shipping.shippingPhone,
        shippingAddressLine1: shipping.shippingAddressLine1,
        shippingAddressLine2: shipping.shippingAddressLine2,
        shippingArea: shipping.shippingArea || shippingArea || null,
        shippingEmirate: shipping.shippingEmirate || shippingEmirate || null,
        shippingNotes: shippingNotes || null,
        acceptedTerms: Boolean(acceptedTerms),
        acceptedDisclaimer: Boolean(acceptedDisclaimer),
        ageConfirmed: true,
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
                productName: item.product!.name,
                productSlug: item.product!.slug,
                vendorName: item.product!.vendor.name,
                variantSku: variant?.sku || null,
                variantStrength: variant?.strength || null,
                variantUnitSize: variant?.unitSize || null,
                variantPriceFils: variant?.priceFils || null,
              };
            })
          ),
        },
      },
    });

    await createVendorOrders(order.id, "NEW");

    if (DEBUG) console.log("[CHECKOUT:CREATE] ✓ Order created:", order.id);
    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error("[CHECKOUT:CREATE] ✗ Error:", error);
    return NextResponse.json(
      { error: "Failed to create order", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
