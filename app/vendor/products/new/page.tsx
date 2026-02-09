import { getVendorContext } from "@/lib/vendor-auth";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewVendorProductPage() {
  const vendor = await getVendorContext();

  return (
    <ProductForm
      vendor={{
        vendorId: vendor.vendorId,
        allowedCategories: vendor.allowedCategories,
      }}
    />
  );
}
