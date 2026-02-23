import { getVendorSession } from "@/lib/vendor-auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingDetailClient } from "./BookingDetailClient";

export default async function VendorBookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getVendorSession();

  if (!session?.vendorId) {
    redirect("/vendor/login");
  }

  const booking = await prisma.serviceBooking.findUnique({
    where: { id: params.id },
    include: {
      product: true,
      vendor: true,
      address: true,
    },
  });

  if (!booking || booking.vendorId !== session.vendorId) {
    notFound();
  }

  return <BookingDetailClient booking={booking} />;
}
