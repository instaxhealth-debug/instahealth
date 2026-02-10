export type MarketplaceCategory = {
  slug: string;
  label: string;
  icon: string;
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { slug: "blood-tests", label: "Blood Tests", icon: "/category-icons/blood-tests.png" },
  { slug: "peptides", label: "Peptides", icon: "/category-icons/peptides.png" },
  { slug: "iv-drips", label: "IV Drips", icon: "/category-icons/iv-drips.png" },
  { slug: "supplements", label: "Supplements", icon: "/category-icons/supplements.png" },
  { slug: "hormones", label: "Hormones", icon: "/category-icons/hormones.png" },
  { slug: "consultations", label: "Consultations", icon: "/category-icons/consultations.png" },
  { slug: "insurance", label: "Insurance", icon: "/category-icons/insurance.png" },
  { slug: "skincare", label: "Skincare", icon: "/category-icons/skincare.png" },
  { slug: "haircare", label: "Haircare", icon: "/category-icons/haircare.png" },
];

if (process.env.NODE_ENV !== "production") {
  const hasPeptides = MARKETPLACE_CATEGORIES.some((cat) => cat.slug === "peptides");
  if (!hasPeptides) {
    throw new Error("Marketplace categories list must include 'peptides'.");
  }
}
