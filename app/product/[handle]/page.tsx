import { prisma } from "@/lib/prisma";
import { ProductDetailWithVariants } from "@/components/products/ProductDetailWithVariants";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

export const revalidate = 0;

interface ProductPageProps {
  params: {
    handle: string;
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  noStore();

  const product = await prisma.product.findUnique({
    where: { slug: params.handle },
    include: {
      vendor: {
        select: {
          name: true,
        },
      },
      variants: {
        where: {
          active: true,
        },
        orderBy: {
          priceFils: "asc",
        },
      },
    },
  });

  if (!product || !product.active) {
    notFound();
  }

  return <ProductDetailWithVariants product={product} />;
}
