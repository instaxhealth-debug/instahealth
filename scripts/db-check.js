const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env.local");

const loadEnvFile = () => {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnvFile();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

prisma.$queryRaw`SELECT 1`
  .then((r) => {
    console.log("DB OK:", r);
  })
  .catch((e) => {
    console.error("DB FAIL:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
