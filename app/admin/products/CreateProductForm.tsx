"use client";

import { useState } from "react";
import { CATEGORY_SLUGS } from "@/lib/utils/category";

interface ValidationErrors {
  name?: string;
  price?: string;
  vendor?: string;
  category?: string;
  locations?: string;
  availability?: string;
}

export function CreateProductForm({
  vendors,
  locations,
  onSubmit,
}: {
  vendors: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isGlobal, setIsGlobal] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validCategories = Object.values(CATEGORY_SLUGS);

  const handleLocationChange = (locationId: string, checked: boolean) => {
    const newLocations = new Set(selectedLocations);
    if (checked) {
      newLocations.add(locationId);
    } else {
      newLocations.delete(locationId);
    }
    setSelectedLocations(newLocations);
  };

  const handleSubmit = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(formEvent.currentTarget);
    const name = formData.get("name") as string;
    const price = formData.get("priceAed") as string;
    const vendor = formData.get("vendorId") as string;
    const category = formData.get("category") as string;

    // Client-side validation
    const newErrors: ValidationErrors = {};

    if (!name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (!price || parseFloat(price) <= 0) {
      newErrors.price = "Price must be positive";
    }

    if (!vendor) {
      newErrors.vendor = "Vendor is required";
    }

    if (!category || !validCategories.includes(category as any)) {
      newErrors.category = "Valid category is required";
    }

    if (!isGlobal && selectedLocations.size === 0) {
      newErrors.locations = "Select at least one location when not global";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Add selected locations to formData
    for (const locationId of selectedLocations) {
      formData.append("locations", locationId);
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ availability: String(error) });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded border bg-white p-4 space-y-3">
      <div className="font-semibold">Create Product</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm space-y-1">
          <span className="block font-medium">Name *</span>
          <input
            name="name"
            required
            className={`w-full rounded border px-3 py-2 text-sm ${
              errors.name ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.name && <div className="text-xs text-red-600">{errors.name}</div>}
        </label>
        <label className="text-sm space-y-1">
          <span className="block font-medium">Price (AED) *</span>
          <input
            name="priceAed"
            required
            type="number"
            step="0.01"
            min="0"
            className={`w-full rounded border px-3 py-2 text-sm ${
              errors.price ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.price && <div className="text-xs text-red-600">{errors.price}</div>}
        </label>
        <label className="text-sm space-y-1">
          <span className="block font-medium">Vendor *</span>
          <select
            name="vendorId"
            required
            className={`w-full rounded border px-3 py-2 text-sm ${
              errors.vendor ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
          >
            <option value="">Select vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          {errors.vendor && <div className="text-xs text-red-600">{errors.vendor}</div>}
        </label>
        <label className="text-sm space-y-1">
          <span className="block font-medium">Category *</span>
          <select
            name="category"
            required
            defaultValue=""
            className={`w-full rounded border px-3 py-2 text-sm ${
              errors.category ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
          >
            <option value="">Select category</option>
            {validCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </option>
            ))}
          </select>
          {errors.category && <div className="text-xs text-red-600">{errors.category}</div>}
        </label>
      </div>

      <div className="space-y-3">
        <div className="font-semibold text-sm">Availability</div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="inStock"
              defaultChecked
              className="rounded"
              onChange={(e) => {
                if (!e.target.checked && !errors.availability) {
                  setErrors((prev) => ({ ...prev, availability: "Warning: Product marked as out of stock" }));
                }
              }}
            />
            <span>In Stock</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="rounded"
              onChange={(e) => {
                if (!e.target.checked && !errors.availability) {
                  setErrors((prev) => ({ ...prev, availability: "Warning: Product marked as inactive" }));
                }
              }}
            />
            <span>Active</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isGlobal"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="rounded"
            />
            <span>Global (all locations)</span>
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">
            Assign to Locations {!isGlobal && <span className="text-red-600">*</span>}
          </div>
          {locations.length === 0 ? (
            <p className="text-sm text-gray-500">No active locations. Add locations first.</p>
          ) : (
            <div className={`grid sm:grid-cols-2 gap-2 p-2 rounded border ${
              errors.locations ? "border-red-300 bg-red-50" : "border-gray-200"
            }`}>
              {locations.map((location) => (
                <label
                  key={location.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLocations.has(location.id)}
                    onChange={(e) => handleLocationChange(location.id, e.target.checked)}
                    className="rounded"
                  />
                  <span>{location.name}</span>
                </label>
              ))}
            </div>
          )}
          {errors.locations && <div className="text-xs text-red-600">{errors.locations}</div>}
          {!isGlobal && selectedLocations.size > 0 && (
            <div className="text-xs text-green-600">
              ✓ Visible in: {Array.from(selectedLocations)
                .map((id) => locations.find((l) => l.id === id)?.name)
                .join(", ")}
            </div>
          )}
          {isGlobal && <div className="text-xs text-green-600">✓ Visible in: Global (all locations)</div>}
        </div>
      </div>

      {errors.availability && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {errors.availability}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
