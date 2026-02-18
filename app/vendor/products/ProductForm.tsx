"use client";

import { useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { isServiceCategory, normalizeCategory, PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from "@/lib/vendor-categories";
import Image from "next/image";

interface VariantForm {
  id?: string;
  sku: string;
  strength: string;
  unitSize?: string;
  priceFils: number;
  active: boolean;
  inStock: boolean;
}

interface ProductFormData {
  name: string;
  description: string;
  imageUrl: string;
  tags: string;
  category: string;
  priceAED: string;
  inventoryStatus: string;
  inStock: boolean;
  active: boolean;
  published: boolean;
  bookingUrl: string;
}

interface VendorProductFormProps {
  vendor: {
    vendorId: string;
    allowedCategories: string[];
  };
  product?: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    tags: string[];
    category: string;
    priceFils: number;
    inventoryStatus: string;
    inStock: boolean;
    active: boolean;
    published: boolean;
    bookingUrl: string | null;
    variants: VariantForm[];
  };
}

export function ProductForm({ vendor, product }: VendorProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const categoryOptions = useMemo(() => {
    if (vendor.allowedCategories?.length) {
      return vendor.allowedCategories;
    }
    return [...PRODUCT_CATEGORIES, ...SERVICE_CATEGORIES];
  }, [vendor.allowedCategories]);

  const [form, setForm] = useState<ProductFormData>({
    name: product?.name || "",
    description: product?.description || "",
    imageUrl: product?.imageUrl || "",
    tags: product?.tags?.join(", ") || "",
    category: product?.category || categoryOptions[0] || "peptides",
    priceAED: product ? (product.priceFils / 100).toFixed(2) : "",
    inventoryStatus: product?.inventoryStatus || "in_stock",
    inStock: product?.inStock ?? true,
    active: product?.active ?? true,
    published: product?.published ?? false,
    bookingUrl: product?.bookingUrl || "",
  });

  const [variants, setVariants] = useState<VariantForm[]>(product?.variants || []);

  const isService = isServiceCategory(normalizeCategory(form.category));

  const updateForm = (updates: Partial<ProductFormData>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WEBP, or GIF image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vendor/uploads/image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();
      updateForm({ imageUrl: data.url });

      toast({
        title: "Uploaded",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: "",
        strength: "",
        unitSize: "",
        priceFils: 0,
        active: true,
        inStock: true,
      },
    ]);
  };

  const handleVariantChange = (index: number, updates: Partial<VariantForm>) => {
    setVariants((prev) =>
      prev.map((variant, i) => (i === index ? { ...variant, ...updates } : variant))
    );
  };

  const handleVariantRemove = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const buildPayload = (overrides?: Partial<ProductFormData>) => {
    const next = { ...form, ...overrides };
    const priceAED = parseFloat(next.priceAED || "0");
    const priceFils = Number.isNaN(priceAED) ? 0 : Math.round(priceAED * 100);
    const tags = next.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return {
      name: next.name,
      description: next.description,
      imageUrl: next.imageUrl || null,
      tags,
      category: normalizeCategory(next.category),
      priceFils,
      inventoryStatus: next.inventoryStatus,
      inStock: next.inStock,
      active: next.active,
      published: next.published,
      bookingUrl: next.bookingUrl || null,
      variants: isService ? [] : variants,
    };
  };

  const submit = async (overrides?: Partial<ProductFormData>) => {
    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const payload = buildPayload(overrides);
      const res = await fetch(product ? `/api/vendor/products/${product.id}` : "/api/vendor/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        if (error?.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
        const requestId = error?.requestId ? ` (requestId: ${error.requestId})` : "";
        const message = error?.message || error?.error || "Failed to save item";
        throw new Error(`Publish failed: ${message}${requestId}`);
      }

      const data = await res.json();
      toast({
        title: "Saved",
        description: "Your item has been saved.",
      });

      if (!product && data?.id) {
        router.push(`/vendor/products/${data.id}`);
      } else {
        router.refresh();
      }
    } catch (error: any) {
      setFormError(error.message || "Failed to save item");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const triggerPublish = async (publish: boolean) => {
    if (!product) {
      return submit({ published: publish });
    }

    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/vendor/products/${product.id}/${publish ? "publish" : "unpublish"}`,
        { method: "POST" }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update publish status");
      }

      toast({
        title: publish ? "Published" : "Unpublished",
        description: "Marketplace visibility updated.",
      });
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{product ? "Edit Item" : "New Item"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600">{fieldErrors.name.join(", ")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full rounded border px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => updateForm({ category: e.target.value })}
              >
                {categoryOptions.map((category: string) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <p className="text-xs text-red-600">{fieldErrors.category.join(", ")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Base price (AED)</Label>
              <Input
                id="price"
                value={form.priceAED}
                onChange={(e) => updateForm({ priceAED: e.target.value })}
                placeholder="0.00"
              />
              {fieldErrors.priceFils && (
                <p className="text-xs text-red-600">{fieldErrors.priceFils.join(", ")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Product Image</Label>

              {form.imageUrl && (
                <div className="relative w-32 h-32 border rounded overflow-hidden">
                  <Image
                    src={form.imageUrl}
                    alt="Product preview"
                    fill
                    className="object-cover"
                    unoptimized={form.imageUrl.startsWith("/")}
                  />
                  <button
                    type="button"
                    onClick={() => updateForm({ imageUrl: "" })}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload Image"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  {showUrlInput ? "Hide URL input" : "Use URL instead"}
                </Button>
              </div>

              {showUrlInput && (
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(e) => updateForm({ imageUrl: e.target.value })}
                  placeholder="https://... or /products/..."
                />
              )}
              {fieldErrors.imageUrl && (
                <p className="text-xs text-red-600">{fieldErrors.imageUrl.join(", ")}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => updateForm({ tags: e.target.value })}
              placeholder="e.g. longevity, recovery"
            />
          </div>

          {isService ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bookingUrl">Booking URL</Label>
                <Input
                  id="bookingUrl"
                  value={form.bookingUrl}
                  onChange={(e) => updateForm({ bookingUrl: e.target.value })}
                  placeholder="https://calendly.com/your-link or Acuity/Fresha/Square URL"
                />
                {fieldErrors.bookingUrl && (
                  <p className="text-xs text-red-600">{fieldErrors.bookingUrl.join(", ")}</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Toggle availability in the marketplace
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={form.active}
                  onCheckedChange={(checked) => updateForm({ active: checked })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inventoryStatus">Inventory status</Label>
                  <select
                    id="inventoryStatus"
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={form.inventoryStatus}
                    onChange={(e) => updateForm({ inventoryStatus: e.target.value })}
                  >
                    <option value="in_stock">In stock</option>
                    <option value="low">Low</option>
                    <option value="out">Out</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="inStock">In stock</Label>
                    <p className="text-xs text-muted-foreground">Controls availability for checkout</p>
                  </div>
                  <Switch
                    id="inStock"
                    checked={form.inStock}
                    onCheckedChange={(checked) => updateForm({ inStock: checked })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="published">Published</Label>
                  <p className="text-xs text-muted-foreground">Visible on the marketplace</p>
                </div>
                <Switch
                  id="published"
                  checked={form.published}
                  onCheckedChange={(checked) => updateForm({ published: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="active">Active</Label>
                  <p className="text-xs text-muted-foreground">Allows orders when published</p>
                </div>
                <Switch
                  id="active"
                  checked={form.active}
                  onCheckedChange={(checked) => updateForm({ active: checked })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isService && (
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.length === 0 ? (
              <div className="text-sm text-muted-foreground">No variants added.</div>
            ) : (
              variants.map((variant, index) => (
                <div key={variant.id || index} className="rounded-lg border border-border/60 p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>SKU</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) => handleVariantChange(index, { sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Strength</Label>
                      <Input
                        value={variant.strength}
                        onChange={(e) => handleVariantChange(index, { strength: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit size</Label>
                      <Input
                        value={variant.unitSize || ""}
                        onChange={(e) => handleVariantChange(index, { unitSize: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price (AED)</Label>
                      <Input
                        value={(variant.priceFils / 100).toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value || "0");
                          handleVariantChange(index, {
                            priceFils: Number.isNaN(value) ? 0 : Math.round(value * 100),
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={variant.active}
                        onCheckedChange={(checked) => handleVariantChange(index, { active: checked })}
                      />
                      <span className="text-sm">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={variant.inStock}
                        onCheckedChange={(checked) => handleVariantChange(index, { inStock: checked })}
                      />
                      <span className="text-sm">In stock</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleVariantRemove(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" onClick={handleAddVariant}>
              Add Variant
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={isSaving} onClick={() => submit()}>
          Save
        </Button>
        <Button variant="outline" disabled={isSaving} onClick={() => submit({ published: false })}>
          Save Draft
        </Button>
        <Button variant="outline" disabled={isSaving} onClick={() => triggerPublish(true)}>
          Publish
        </Button>
        {product?.published && (
          <Button variant="outline" disabled={isSaving} onClick={() => triggerPublish(false)}>
            Unpublish
          </Button>
        )}
        {product && (
          <Button variant="destructive" disabled={isSaving} onClick={() => submit({ active: false })}>
            Deactivate
          </Button>
        )}
      </div>
    </div>
  );
}
