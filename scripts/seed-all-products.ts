import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ProductData {
  name: string;
  slug: string;
  category: string;
  priceFils: number;
  description?: string;
}

const productsByVendor: Record<string, ProductData[]> = {
  // Peptides
  "instapepz": [
    { name: "BPC-157", slug: "instapepz-bpc157", category: "peptides", priceFils: 12999, description: "Injury recovery & gut health" },
    { name: "TB-500", slug: "instapepz-tb500", category: "peptides", priceFils: 14999, description: "Tissue repair & recovery" },
    { name: "Ipamorelin", slug: "instapepz-ipamorelin", category: "peptides", priceFils: 16999, description: "Natural growth hormone releaser" },
  ],
  "uae-peptides": [
    { name: "Hexarelin", slug: "uae-peptides-hex", category: "peptides", priceFils: 15999, description: "GH secretagogue" },
    { name: "GHRP-6", slug: "uae-peptides-ghrp6", category: "peptides", priceFils: 13999, description: "Appetite & muscle growth" },
    { name: "AOD-9604", slug: "uae-peptides-aod", category: "peptides", priceFils: 17999, description: "Fat loss peptide" },
  ],
  "syncom-peptides": [
    { name: "Selank", slug: "syncom-selank", category: "peptides", priceFils: 11999, description: "Anxiety & mood support" },
    { name: "Semax", slug: "syncom-semax", category: "peptides", priceFils: 12999, description: "Cognitive enhancement" },
  ],

  // Blood Tests
  "al-zahra-labs": [
    { name: "Full Blood Count", slug: "azl-fbc", category: "blood-tests", priceFils: 5999, description: "Complete health screening" },
    { name: "Lipid Profile", slug: "azl-lipid", category: "blood-tests", priceFils: 4999, description: "Cholesterol & triglycerides" },
    { name: "Hormone Panel", slug: "azl-hormone", category: "blood-tests", priceFils: 7999, description: "Testosterone, estrogen, cortisol" },
    { name: "Liver Function", slug: "azl-liver", category: "blood-tests", priceFils: 4499, description: "Liver health markers" },
  ],
  "aster-labs": [
    { name: "Vitamin D Test", slug: "aster-vitd", category: "blood-tests", priceFils: 3999, description: "Vitamin D levels" },
    { name: "Thyroid Function TSH", slug: "aster-tsh", category: "blood-tests", priceFils: 4999, description: "Thyroid screening" },
    { name: "Blood Glucose", slug: "aster-glucose", category: "blood-tests", priceFils: 2999, description: "Fasting glucose test" },
  ],
  "thumbay-labs": [
    { name: "COVID-19 PCR", slug: "thumbay-covid", category: "blood-tests", priceFils: 3499, description: "Rapid COVID test" },
    { name: "Allergy Panel", slug: "thumbay-allergy", category: "blood-tests", priceFils: 6999, description: "Common allergen screening" },
    { name: "Iron Studies", slug: "thumbay-iron", category: "blood-tests", priceFils: 5499, description: "Iron & ferritin levels" },
  ],

  // IV Drips
  "iv-drips-dubai": [
    { name: "Hydration IV Drip", slug: "ivd-hydration", category: "iv-drips", priceFils: 39999, description: "Essential electrolyte infusion" },
    { name: "Energy Booster IV", slug: "ivd-energy", category: "iv-drips", priceFils: 49999, description: "B-complex & amino acids" },
    { name: "Recovery IV", slug: "ivd-recovery", category: "iv-drips", priceFils: 54999, description: "Post-workout recovery" },
    { name: "Beauty IV", slug: "ivd-beauty", category: "iv-drips", priceFils: 59999, description: "Collagen & vitamin C" },
  ],
  "hydration-clinic-uae": [
    { name: "Wellness Infusion", slug: "hc-wellness", category: "iv-drips", priceFils: 44999, description: "General wellness IV" },
    { name: "Immunity Booster", slug: "hc-immunity", category: "iv-drips", priceFils: 49999, description: "Vitamin C & zinc" },
    { name: "Hangover Relief", slug: "hc-hangover", category: "iv-drips", priceFils: 39999, description: "Quick recovery" },
  ],
  "wellness-hub-me": [
    { name: "Detox IV", slug: "wh-detox", category: "iv-drips", priceFils: 54999, description: "Liver support & detox" },
    { name: "Athletic Performance", slug: "wh-athletic", category: "iv-drips", priceFils: 59999, description: "Enhanced endurance" },
  ],

  // Supplements
  "nutra-uae": [
    { name: "Omega-3 Fish Oil", slug: "nu-omega3", category: "supplements", priceFils: 7999, description: "Heart & brain health" },
    { name: "Multivitamin", slug: "nu-multi", category: "supplements", priceFils: 5999, description: "Daily essentials" },
    { name: "Protein Powder", slug: "nu-protein", category: "supplements", priceFils: 8999, description: "Whey isolate" },
    { name: "Creatine Monohydrate", slug: "nu-creatine", category: "supplements", priceFils: 4999, description: "Muscle strength" },
  ],
  "health-bazaar": [
    { name: "Vitamin C 1000mg", slug: "hb-vitc", category: "supplements", priceFils: 3999, description: "Immune support" },
    { name: "Magnesium", slug: "hb-magnesium", category: "supplements", priceFils: 4499, description: "Sleep & relaxation" },
    { name: "Iron Supplement", slug: "hb-iron", category: "supplements", priceFils: 5499, description: "Energy & vitality" },
  ],
  "pharmacy-plus": [
    { name: "Vitamin D3 2000IU", slug: "pp-vitd3", category: "supplements", priceFils: 3499, description: "Bone health" },
    { name: "B-Complex", slug: "pp-bcomplex", category: "supplements", priceFils: 4999, description: "Energy & metabolism" },
  ],

  // Hormones
  "hormone-health-dubai": [
    { name: "Testosterone Support", slug: "hh-test", category: "hormones", priceFils: 9999, description: "Natural testosterone booster" },
    { name: "Estrogen Balance", slug: "hh-estrogen", category: "hormones", priceFils: 8999, description: "Women's hormone support" },
    { name: "Cortisol Manager", slug: "hh-cortisol", category: "hormones", priceFils: 7999, description: "Stress hormone regulation" },
    { name: "Thyroid Support", slug: "hh-thyroid", category: "hormones", priceFils: 6999, description: "Thyroid function" },
  ],
  "elite-wellness-uae": [
    { name: "HGH Booster", slug: "ew-hgh", category: "hormones", priceFils: 12999, description: "Growth hormone support" },
    { name: "DHEA", slug: "ew-dhea", category: "hormones", priceFils: 8999, description: "Hormone precursor" },
  ],
  "rejuven8": [
    { name: "Hormone Balance Kit", slug: "rj-kit", category: "hormones", priceFils: 19999, description: "Complete hormone support" },
    { name: "Progesterone Cream", slug: "rj-prog", category: "hormones", priceFils: 7999, description: "Natural progesterone" },
  ],

  // Consultations
  "medicana-clinics": [
    { name: "General Consultation 30min", slug: "mc-general30", category: "consultations", priceFils: 14999, description: "Initial medical consultation" },
    { name: "Specialist Consultation", slug: "mc-specialist", category: "consultations", priceFils: 24999, description: "Specialist medical advice" },
    { name: "Follow-up Consultation", slug: "mc-followup", category: "consultations", priceFils: 9999, description: "30-minute follow-up" },
  ],
  "healthpoint": [
    { name: "Telemedicine Consultation", slug: "hp-tele", category: "consultations", priceFils: 12999, description: "Video consultation" },
    { name: "Health Assessment", slug: "hp-assessment", category: "consultations", priceFils: 19999, description: "Comprehensive health assessment" },
  ],
  "dr-clinics": [
    { name: "Doctor Consultation", slug: "dr-consult", category: "consultations", priceFils: 15999, description: "Expert doctor consultation" },
    { name: "Wellness Planning", slug: "dr-wellness", category: "consultations", priceFils: 22999, description: "Personalized wellness plan" },
  ],

  // Insurance (simplified offerings)
  "daman": [
    { name: "Basic Health Plan", slug: "daman-basic", category: "insurance", priceFils: 199999, description: "Monthly health insurance" },
    { name: "Premium Plan", slug: "daman-premium", category: "insurance", priceFils: 399999, description: "Full coverage plan" },
  ],
  "takaful": [
    { name: "Islamic Health Plan", slug: "takaful-basic", category: "insurance", priceFils: 189999, description: "Shariah-compliant insurance" },
    { name: "Family Plan", slug: "takaful-family", category: "insurance", priceFils: 549999, description: "Family coverage" },
  ],
  "empire-insurance": [
    { name: "Standard Cover", slug: "empire-standard", category: "insurance", priceFils: 179999, description: "Standard health coverage" },
  ],

  // Skincare
  "dermatology-center-dubai": [
    { name: "Facial Treatment", slug: "dcd-facial", category: "skincare", priceFils: 39999, description: "Professional facial" },
    { name: "Skincare Kit", slug: "dcd-kit", category: "skincare", priceFils: 19999, description: "Premium skincare set" },
    { name: "Anti-Aging Serum", slug: "dcd-serum", category: "skincare", priceFils: 9999, description: "Advanced serum" },
  ],
  "skin-lab-me": [
    { name: "Vitamin C Cream", slug: "sl-vitc", category: "skincare", priceFils: 8999, description: "Brightening cream" },
    { name: "Retinol Night Cream", slug: "sl-retinol", category: "skincare", priceFils: 10999, description: "Anti-aging treatment" },
    { name: "Moisturizer SPF", slug: "sl-spf", category: "skincare", priceFils: 7999, description: "Daily protection" },
  ],
  "glow-med": [
    { name: "Beauty Facial Set", slug: "gm-facial", category: "skincare", priceFils: 24999, description: "Complete facial kit" },
    { name: "Hydrating Mask", slug: "gm-mask", category: "skincare", priceFils: 5999, description: "Weekly treatment mask" },
  ],

  // Haircare
  "hair-growth-clinic-uae": [
    { name: "Hair Growth Serum", slug: "hgc-serum", category: "haircare", priceFils: 8999, description: "Professional growth serum" },
    { name: "Scalp Treatment", slug: "hgc-scalp", category: "haircare", priceFils: 6999, description: "Deep scalp therapy" },
    { name: "Hair Vitamins", slug: "hgc-vitamins", category: "haircare", priceFils: 5999, description: "Hair health supplement" },
  ],
  "follicle-pro-me": [
    { name: "Hair Restoration Kit", slug: "fpm-kit", category: "haircare", priceFils: 14999, description: "Complete restoration system" },
    { name: "Anti-Hair Loss Shampoo", slug: "fpm-shampoo", category: "haircare", priceFils: 4999, description: "Specialized shampoo" },
  ],
  "restoration-labs": [
    { name: "Advanced Hair Repair", slug: "rl-repair", category: "haircare", priceFils: 9999, description: "Intensive repair treatment" },
    { name: "Conditioner", slug: "rl-conditioner", category: "haircare", priceFils: 4499, description: "Premium conditioner" },
  ],
};

async function main() {
  // Get all vendors
  const vendors = await prisma.vendor.findMany({
    select: { id: true, slug: true },
  });

  const vendorMap = Object.fromEntries(vendors.map((v) => [v.slug, v.id]));

  let createdCount = 0;

  // Seed products for each vendor
  for (const [vendorSlug, products] of Object.entries(productsByVendor)) {
    const vendorId = vendorMap[vendorSlug];

    if (!vendorId) {
      console.warn(`Vendor "${vendorSlug}" not found, skipping products`);
      continue;
    }

    for (const product of products) {
      await prisma.product.upsert({
        where: { slug: product.slug },
        update: {},
        create: {
          name: product.name,
          slug: product.slug,
          category: product.category,
          priceFils: product.priceFils,
          description: product.description || "",
          active: true,
          inStock: true,
          isGlobal: true,
          vendorId,
        },
      });
      createdCount++;
    }
  }

  console.log(`Seeded ${createdCount} products for all vendors`);
}

main()
  .catch((err) => {
    console.error("Failed to seed products", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
