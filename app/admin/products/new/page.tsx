import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { CATEGORY_SLUGS } from "@/lib/utils/category";
import { CreateProductForm } from "../CreateProductForm";
import { upsertProductToAlgolia } from "@/server/services/algolia";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

// Canonical category slugs (hard-enforced)
const VALID_CATEGORIES = Object.values(CATEGORY_SLUGS);

async function createProduct(formData: FormData) {
  "use server";
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const priceAed = (formData.get("priceAed") as string)?.trim();
  const vendorId = (formData.get("vendorId") as string)?.trim();
  const categoryInput = (formData.get("category") as string)?.trim();
  const active = formData.get("active") === "on";
  const inStock = formData.get("inStock") === "on";
  const isGlobal = formData.get("isGlobal") === "on";
  const locationIds = (formData.getAll("locations") as string[]).filter(Boolean);

  // Hard-enforce required fields
  if (!name || !priceAed || !vendorId || !categoryInput) {
    throw new Error("Name, price, vendor, and category are required");
  }

  // Hard-enforce category is one of the 9 valid slugs
  if (!VALID_CATEGORIES.includes(categoryInput as any)) {
    throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  const priceFils = Math.round(Number(priceAed) * 100);
  if (Number.isNaN(priceFils) || priceFils <= 0) {
    throw new Error("Price must be a positive number");
  }

  // Hard-enforce availability rules
  if (!isGlobal && locationIds.length === 0) {
    throw new Error("Product must be either Global OR assigned to at least one location");
  }

  const baseSlug = generateSlug(name);
  const slug = await generateUniqueSlug(baseSlug, async (candidate) => {
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    return !!existing;
  });

  let createdProductId = "";
  await prisma.$transaction(async (tx: any) => {
    const product = await tx.product.create({
      data: {
        name,
        slug,
        vendorId,
        category: categoryInput,
        priceFils,
        inStock,
        active,
        isGlobal,
      },
    });

    createdProductId = product.id;

    if (!isGlobal && locationIds.length > 0) {
      await tx.productLocation.createMany({
        data: locationIds.map((locationId) => ({
          productId: product.id,
          locationId,
        })),
      });
    }
  });

  if (createdProductId) {
    await upsertProductToAlgolia(createdProductId);
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export default async function CreateProductPage() {
  await requireAdmin();

  const [vendors, locations] = await Promise.all([
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/admin/products">
        <Button variant="ghost" size="sm" className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Product</h1>
        <p className="text-gray-600">
          Add a new product to the marketplace. All fields marked with * are required.
        </p>
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <CreateProductForm
          vendors={vendors}
          locations={locations}
          onSubmit={createProduct}
        />
      </div>
    </div>
  );
}
