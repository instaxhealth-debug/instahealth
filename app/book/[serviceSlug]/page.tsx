import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingCheckoutClient } from "./BookingCheckoutClient";

export default async function BookingPage({
  params,
}: {
  params: { serviceSlug: string };
}) {
  const { serviceSlug } = params;

  // Fetch service product from database
  const product = await prisma.product.findUnique({
    where: { slug: serviceSlug },
    include: {
      vendor: true,
    },
  });

  if (!product) {
    notFound();
  }

  // Verify it's a service category
  const serviceCategories = ["iv-drips", "blood-tests"];
  if (!serviceCategories.includes(product.category)) {
    notFound();
  }

  return <BookingCheckoutClient product={product} />;
}
