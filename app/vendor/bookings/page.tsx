import { getVendorSession } from "@/lib/vendor-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingsList } from "./BookingsList";

export default async function VendorBookingsPage() {
  const session = await getVendorSession();

  if (!session?.vendorId) {
    redirect("/vendor/login");
  }

  // Fetch bookings for this vendor
  const bookings = await prisma.serviceBooking.findMany({
    where: {
      vendorId: session.vendorId,
    },
    include: {
      product: {
        select: { name: true, slug: true },
      },
      address: {
        select: {
          formattedAddress: true,
          city: true,
          emirate: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Service Bookings</h1>
      <BookingsList bookings={bookings} />
    </div>
  );
}
