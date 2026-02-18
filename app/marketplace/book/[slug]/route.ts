import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logMarketplaceEvent } from "@/lib/marketplace-events";
import { isValidBookingUrl } from "@/lib/vendor-categories";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      vendorId: true,
      active: true,
      published: true,
      bookingUrl: true,
      vendor: {
        select: {
          bookingUrl: true,
        },
      },
    },
  });

  if (!product || !product.active || !product.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resolvedBookingUrl = product.bookingUrl || product.vendor.bookingUrl;

  if (!resolvedBookingUrl || !isValidBookingUrl(resolvedBookingUrl)) {
    return NextResponse.json({ error: "Booking unavailable" }, { status: 404 });
  }

  try {
    await logMarketplaceEvent({
      productId: product.id,
      vendorId: product.vendorId,
      eventType: "BOOK_CLICK",
    });
  } catch (error) {
    console.error("[MARKETPLACE_BOOK] Failed to log event", error);
  }

  return NextResponse.redirect(resolvedBookingUrl, { status: 307 });
}
