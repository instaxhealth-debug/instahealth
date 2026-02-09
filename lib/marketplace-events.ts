import { prisma } from "@/lib/prisma";
import type { MarketplaceEventType } from "@prisma/client";

export async function logMarketplaceEvent(input: {
  productId: string;
  vendorId: string;
  eventType: MarketplaceEventType;
}) {
  await prisma.marketplaceEvent.create({
    data: {
      productId: input.productId,
      vendorId: input.vendorId,
      eventType: input.eventType,
    },
  });
}
