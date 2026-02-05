import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(req: NextRequest) {
  const DEBUG = process.env.DEBUG_CHECKOUT === "true";
  
  try {
    const session = await auth();
    if (DEBUG) console.log("[STRIPE:SESSION] Session:", session?.user?.email ? "✓ Authenticated" : "✗ No session");
    
    if (!session?.user?.email) {
      if (DEBUG) console.log("[STRIPE:SESSION] Rejected: No authenticated session");
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId } = body;

    if (DEBUG) console.log("[STRIPE:SESSION] Order ID:", orderId);

    if (!orderId) {
      if (DEBUG) console.log("[STRIPE:SESSION] Rejected: No orderId");
      return NextResponse.json({ error: "Order ID is required", code: "MISSING_ORDER_ID" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        user: { email: session.user.email },
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      if (DEBUG) console.log("[STRIPE:SESSION] Rejected: Order not found");
      return NextResponse.json({ error: "Order not found", code: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    if (DEBUG) console.log("[STRIPE:SESSION] Order status:", order.status);

    if (order.status !== "PENDING_PAYMENT") {
      if (DEBUG) console.log("[STRIPE:SESSION] Rejected: Order not in PENDING_PAYMENT status");
      return NextResponse.json({ error: "Order is not payable", code: "ORDER_NOT_PAYABLE" }, { status: 400 });
    }

    if (DEBUG) {
      console.log("[STRIPE:SESSION] Creating Stripe session with", order.items.length, "items");
      console.log("[STRIPE:SESSION] Line items:", order.items.map(i => ({ name: i.productName, qty: i.quantity, amount: i.unitPriceFils })));
    }

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: session.user.email || undefined,
      client_reference_id: order.id,
      line_items: order.items.map((item: any) => ({
        price_data: {
          currency: "aed",
          unit_amount: item.unitPriceFils,
          product_data: {
            name: item.productName + (item.variantStrength ? ` (${item.variantStrength})` : ""),
          },
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout/success?orderId=${order.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout/cancel?orderId=${order.id}`,
      metadata: {
        orderId: order.id,
        userId: order.userId || "",
      },
    });

    if (DEBUG) console.log("[STRIPE:SESSION] ✓ Stripe session created:", stripeSession.id);

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: stripeSession.id },
    });

    if (DEBUG) console.log("[STRIPE:SESSION] ✓ Order updated with session ID");

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("[STRIPE:SESSION] ✗ Error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe session", code: "STRIPE_ERROR" },
      { status: 500 }
    );
  }
}
