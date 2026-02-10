export type MarketplaceCategory = {
  slug: string;
  label: string;
  icon: string;
  image: string;
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    slug: "blood-tests",
    label: "Blood Tests",
    icon: "/category-icons/blood-tests.png",
    image: "/bloodslogo.png",
  },
  {
    slug: "peptides",
    label: "Peptides",
    icon: "/category-icons/peptides.png",
    image: "/peptidelogo.png",
  },
  {
    slug: "iv-drips",
    label: "IV Drips",
    icon: "/category-icons/iv-drips.png",
    image: "/ivlogo.png",
  },
  {
    slug: "supplements",
    label: "Supplements",
    icon: "/category-icons/supplements.png",
    image: "/suppslogo.png",
  },
  {
    slug: "hormones",
    label: "Hormones",
    icon: "/category-icons/hormones.png",
    image: "/hormonelogo.png",
  },
  {
    slug: "consultations",
    label: "Consultations",
    icon: "/category-icons/consultations.png",
    image: "/doctorlogo.png",
  },
  {
    slug: "insurance",
    label: "Insurance",
    icon: "/category-icons/insurance.png",
    image: "/insurancelogo.png",
  },
  {
    slug: "skincare",
    label: "Skincare",
    icon: "/category-icons/skincare.png",
    image: "/category-icons/skincare.png",
  },
  {
    slug: "haircare",
    label: "Haircare",
    icon: "/category-icons/haircare.png",
    image: "/haircarelogo.png",
  },
];

if (process.env.NODE_ENV !== "production") {
  const hasPeptides = MARKETPLACE_CATEGORIES.some((cat) => cat.slug === "peptides");
  if (!hasPeptides) {
    throw new Error("Marketplace categories list must include 'peptides'.");
  }
}
