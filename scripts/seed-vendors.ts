import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vendors = [
    // Peptides (3 vendors)
    { 
      name: "InstaPepz", 
      slug: "instapepz", 
      status: "active", 
      logoUrl: "/vendors/peptidevendors/pepz.png",
      tagline: "Everything Peptides",
      rating: 5.0,
      ratingCount: 500,
      isHouseBrand: true
    },
    { 
      name: "UAE Peptides", 
      slug: "uae-peptides", 
      status: "active", 
      logoUrl: "/vendors/peptidevendors/uaepeptides.png",
      tagline: "UAE Largest Peptide Supplier",
      rating: 4.9,
      ratingCount: 500,
      isHouseBrand: false
    },
    { 
      name: "Syncom Peptides", 
      slug: "syncom-peptides", 
      status: "active", 
      logoUrl: "/vendors/peptidevendors/Syncompeptides.png",
      tagline: "Peptide Lab",
      rating: 4.8,
      ratingCount: 180,
      isHouseBrand: false
    },

    // Blood Tests (3 vendors)
    { 
      name: "Al Zahra Hospital Labs", 
      slug: "al-zahra-labs", 
      status: "active", 
      logoUrl: null,
      tagline: "Dubai's Premier Lab Services",
      rating: 4.9,
      ratingCount: 420,
      isHouseBrand: false
    },
    { 
      name: "Aster Labs", 
      slug: "aster-labs", 
      status: "active", 
      logoUrl: null,
      tagline: "Comprehensive Health Testing",
      rating: 4.7,
      ratingCount: 310,
      isHouseBrand: false
    },
    { 
      name: "Thumbay Labs", 
      slug: "thumbay-labs", 
      status: "active", 
      logoUrl: null,
      tagline: "Quick & Accurate Results",
      rating: 4.6,
      ratingCount: 280,
      isHouseBrand: false
    },

    // IV Drips (3 vendors)
    { 
      name: "IV Drips Dubai", 
      slug: "iv-drips-dubai", 
      status: "active", 
      logoUrl: null,
      tagline: "Premium IV Therapy",
      rating: 4.8,
      ratingCount: 350,
      isHouseBrand: false
    },
    { 
      name: "Hydration Clinic UAE", 
      slug: "hydration-clinic-uae", 
      status: "active", 
      logoUrl: null,
      tagline: "Wellness Through Hydration",
      rating: 4.7,
      ratingCount: 290,
      isHouseBrand: false
    },
    { 
      name: "Wellness Hub ME", 
      slug: "wellness-hub-me", 
      status: "active", 
      logoUrl: null,
      tagline: "Complete Wellness Solutions",
      rating: 4.6,
      ratingCount: 240,
      isHouseBrand: false
    },
    { 
      name: "InstaIVZ",
      slug: "ivz",
      status: "active",
      logoUrl: "/vendors/ivdripvendors/ivz.png",
      tagline: "On-demand IV therapy",
      rating: 4.8,
      ratingCount: 180,
      isHouseBrand: true
    },
    { 
      name: "Wellth",
      slug: "wellth",
      status: "active",
      logoUrl: "/vendors/ivdripvendors/wellth.png",
      tagline: "Premium IV wellness",
      rating: 4.7,
      ratingCount: 210,
      isHouseBrand: false
    },

    // Supplements (3 vendors)
    { 
      name: "Nutra UAE", 
      slug: "nutra-uae", 
      status: "active", 
      logoUrl: null,
      tagline: "Premium Nutritional Supplements",
      rating: 4.8,
      ratingCount: 380,
      isHouseBrand: false
    },
    { 
      name: "Health Bazaar", 
      slug: "health-bazaar", 
      status: "active", 
      logoUrl: null,
      tagline: "Your Health Store",
      rating: 4.7,
      ratingCount: 320,
      isHouseBrand: false
    },
    { 
      name: "Pharmacy Plus", 
      slug: "pharmacy-plus", 
      status: "active", 
      logoUrl: null,
      tagline: "Health & Wellness Experts",
      rating: 4.5,
      ratingCount: 260,
      isHouseBrand: false
    },

    // Hormones (3 vendors)
    { 
      name: "Hormone Health Dubai", 
      slug: "hormone-health-dubai", 
      status: "active", 
      logoUrl: null,
      tagline: "Hormone Balance Specialists",
      rating: 4.9,
      ratingCount: 410,
      isHouseBrand: false
    },
    { 
      name: "Elite Wellness UAE", 
      slug: "elite-wellness-uae", 
      status: "active", 
      logoUrl: null,
      tagline: "Elite Performance & Health",
      rating: 4.8,
      ratingCount: 340,
      isHouseBrand: false
    },
    { 
      name: "Rejuven8", 
      slug: "rejuven8", 
      status: "active", 
      logoUrl: null,
      tagline: "Age-Defying Solutions",
      rating: 4.7,
      ratingCount: 300,
      isHouseBrand: false
    },

    // Consultations (3 vendors)
    { 
      name: "Medicana Clinics", 
      slug: "medicana-clinics", 
      status: "active", 
      logoUrl: null,
      tagline: "Expert Medical Consultations",
      rating: 4.9,
      ratingCount: 450,
      isHouseBrand: false
    },
    { 
      name: "Healthpoint", 
      slug: "healthpoint", 
      status: "active", 
      logoUrl: null,
      tagline: "Your Health Gateway",
      rating: 4.8,
      ratingCount: 360,
      isHouseBrand: false
    },
    { 
      name: "Dr Clinics", 
      slug: "dr-clinics", 
      status: "active", 
      logoUrl: null,
      tagline: "Leading Healthcare Provider",
      rating: 4.7,
      ratingCount: 320,
      isHouseBrand: false
    },

    // Insurance (3 vendors)
    { 
      name: "Daman", 
      slug: "daman", 
      status: "active", 
      logoUrl: null,
      tagline: "Health Insurance Leader",
      rating: 4.6,
      ratingCount: 220,
      isHouseBrand: false
    },
    { 
      name: "Takaful", 
      slug: "takaful", 
      status: "active", 
      logoUrl: null,
      tagline: "Islamic Insurance Solutions",
      rating: 4.5,
      ratingCount: 190,
      isHouseBrand: false
    },
    { 
      name: "Empire Insurance", 
      slug: "empire-insurance", 
      status: "active", 
      logoUrl: null,
      tagline: "Comprehensive Coverage",
      rating: 4.4,
      ratingCount: 160,
      isHouseBrand: false
    },

    // Skincare (3 vendors)
    { 
      name: "Dermatology Center Dubai", 
      slug: "dermatology-center-dubai", 
      status: "active", 
      logoUrl: null,
      tagline: "Professional Skin Care",
      rating: 4.9,
      ratingCount: 480,
      isHouseBrand: false
    },
    { 
      name: "Skin Lab ME", 
      slug: "skin-lab-me", 
      status: "active", 
      logoUrl: null,
      tagline: "Science-Based Skincare",
      rating: 4.8,
      ratingCount: 390,
      isHouseBrand: false
    },
    { 
      name: "Glow Med", 
      slug: "glow-med", 
      status: "active", 
      logoUrl: null,
      tagline: "Beauty & Wellness",
      rating: 4.7,
      ratingCount: 310,
      isHouseBrand: false
    },

    // Haircare (3 vendors)
    { 
      name: "Hair Growth Clinic UAE", 
      slug: "hair-growth-clinic-uae", 
      status: "active", 
      logoUrl: null,
      tagline: "Hair Restoration Experts",
      rating: 4.8,
      ratingCount: 360,
      isHouseBrand: false
    },
    { 
      name: "Follicle Pro ME", 
      slug: "follicle-pro-me", 
      status: "active", 
      logoUrl: null,
      tagline: "Advanced Hair Solutions",
      rating: 4.7,
      ratingCount: 300,
      isHouseBrand: false
    },
    { 
      name: "Restoration Labs", 
      slug: "restoration-labs", 
      status: "active", 
      logoUrl: null,
      tagline: "Hair Care Innovation",
      rating: 4.6,
      ratingCount: 250,
      isHouseBrand: false
    },
  ];

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { slug: vendor.slug },
      update: { 
        name: vendor.name, 
        status: vendor.status, 
        logoUrl: vendor.logoUrl,
        tagline: vendor.tagline,
        rating: vendor.rating,
        ratingCount: vendor.ratingCount,
        isHouseBrand: vendor.isHouseBrand
      },
      create: {
        name: vendor.name,
        slug: vendor.slug,
        status: vendor.status,
        email: `${vendor.slug}@example.com`,
        logoUrl: vendor.logoUrl,
        tagline: vendor.tagline,
        rating: vendor.rating,
        ratingCount: vendor.ratingCount,
        isHouseBrand: vendor.isHouseBrand
      },
    });
  }

  console.log("Seeded vendors:", vendors.map((v) => v.slug).join(", "));
}

main()
  .catch((err) => {
    console.error("Failed to seed vendors", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
