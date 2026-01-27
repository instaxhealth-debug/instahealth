import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const locations = [
    { name: "Dubai", slug: "dubai" },
    { name: "Abu Dhabi", slug: "abu-dhabi" },
    { name: "Sharjah", slug: "sharjah" },
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { slug: location.slug },
      update: { name: location.name, isActive: true },
      create: { name: location.name, slug: location.slug, isActive: true },
    });
  }

  console.log("Seeded locations:", locations.map((l) => l.slug).join(", "));
}

main()
  .catch((err) => {
    console.error("Failed to seed locations", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
