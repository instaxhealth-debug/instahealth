import { prisma } from "@/lib/prisma";
import { ProductDetailWithVariants } from "@/components/products/ProductDetailWithVariants";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isServiceCategory } from "@/lib/vendor-categories";
import { logMarketplaceEvent } from "@/lib/marketplace-events";
import { redirect } from "next/navigation";

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

  if (!product || !product.active || !product.published) {
    notFound();
  }

  if (isServiceCategory(product.category)) {
    if (product.calendlyUrl) {
      try {
        await logMarketplaceEvent({
          productId: product.id,
          vendorId: product.vendorId,
          eventType: "BOOK_CLICK",
        });
      } catch (error) {
        console.error("[PRODUCT_PAGE] Failed to log booking click", error);
      }
      redirect(product.calendlyUrl);
    }
    notFound();
  }

  if (!product.published) {
    notFound();
  }

  try {
    await logMarketplaceEvent({
      productId: product.id,
      vendorId: product.vendorId,
      eventType: "VIEW",
    });
  } catch (error) {
    console.error("[PRODUCT_PAGE] Failed to log view", error);
  }

  return <ProductDetailWithVariants product={product} />;
}
