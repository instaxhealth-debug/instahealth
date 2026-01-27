// scripts/seed-admin.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "cruz@jccl.com.au";
  const password = "frangido3.";

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: passwordHash,
      role: "ADMIN",
    },
    create: {
      email,
      passwordHash: passwordHash,
      role: "ADMIN",
      name: "Cruz",
    },
  });

  console.log("✅ Admin user seeded:", {
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
