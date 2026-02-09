import { notFound } from "next/navigation";
import { getVendorContext } from "@/lib/vendor-auth";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../ProductForm";

type VariantRow = {
  id: string;
  sku: string;
  strength: string;
  unitSize: string | null;
  priceFils: number;
  active: boolean;
  inStock: boolean;
};

export const dynamic = "force-dynamic";

export default async function VendorProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const vendor = await getVendorContext();

  const product = await prisma.product.findFirst({
    where: {
      id: params.id,
      vendorId: vendor.vendorId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      tags: true,
      category: true,
      priceFils: true,
      inventoryStatus: true,
      inStock: true,
      active: true,
      published: true,
      calendlyUrl: true,
      variants: {
        select: {
          id: true,
          sku: true,
          strength: true,
          unitSize: true,
          priceFils: true,
          active: true,
          inStock: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <ProductForm
      vendor={{
        vendorId: vendor.vendorId,
        allowedCategories: vendor.allowedCategories,
      }}
      product={{
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        tags: product.tags,
        category: product.category,
        priceFils: product.priceFils,
        inventoryStatus: product.inventoryStatus,
        inStock: product.inStock,
        active: product.active,
        published: product.published,
        calendlyUrl: product.calendlyUrl,
        variants: product.variants.map((variant: VariantRow) => ({
          id: variant.id,
          sku: variant.sku,
          strength: variant.strength,
          unitSize: variant.unitSize || "",
          priceFils: variant.priceFils,
          active: variant.active,
          inStock: variant.inStock,
        })),
      }}
    />
  );
}
