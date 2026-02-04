export type CategoryItem = {
  id: string;
  name: string;
  marketplaceRoute: string;
  image: string;
  description?: string;
};

export const categories: CategoryItem[] = [
  {
    id: "blood-tests",
    name: "Blood Tests",
    marketplaceRoute: "/marketplace/blood-tests",
    image: "/bloodslogo.png",
    description: "Blood testing packages",
  },
  {
    id: "iv-drips",
    name: "IV Drips",
    marketplaceRoute: "/marketplace/iv-drips",
    image: "/ivlogo.png",
    description: "IV therapy and wellness drips",
  },
  {
    id: "clinics",
    name: "Clinics",
    marketplaceRoute: "/marketplace/clinics",
    image: "/category-icons/CLINICSLOGO.png",
    description: "Medical clinics and healthcare facilities",
  },
  {
    id: "peptides",
    name: "Peptides",
    marketplaceRoute: "/marketplace/peptides",
    image: "/peptidelogo.png",
    description: "Peptide products from verified vendors",
  },
  {
    id: "hormones",
    name: "Hormones",
    marketplaceRoute: "/marketplace/hormones",
    image: "/hormonelogo.png",
    description: "Hormone optimization",
  },
  {
    id: "consultations",
    name: "Consultations",
    marketplaceRoute: "/marketplace/consultations",
    image: "/doctorlogo.png",
    description: "Consult with health pros",
  },
  {
    id: "insurance",
    name: "Insurance",
    marketplaceRoute: "/marketplace/insurance",
    image: "/insurancelogo.png",
    description: "Health insurance plans",
  },
  {
    id: "supplements",
    name: "Supplements",
    marketplaceRoute: "/marketplace/supplements",
    image: "/suppslogo.png",
    description: "Vitamins and supplements",
  },
  {
    id: "haircare",
    name: "Haircare",
    marketplaceRoute: "/marketplace/haircare",
    image: "/haircarelogo.png",
    description: "Hair wellness products",
  },
];
