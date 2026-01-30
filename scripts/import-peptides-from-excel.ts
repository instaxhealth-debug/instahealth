import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

interface ExtractedProduct {
  company: string;
  vendorSlug: string;
  productName: string;
  price: number | null;
  currency: string;
  category: string;
  sourceUrl: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

function generateProductSlug(vendorSlug: string, productName: string): string {
  const nameSlug = slugify(productName);
  return `${vendorSlug}-${nameSlug}`;
}

// ============================================================================
// READ EXCEL FILE
// ============================================================================

async function readExcelFile(filePath: string): Promise<ExtractedProduct[]> {
  console.log(`📖 Reading Excel file: ${filePath}\n`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<any>(worksheet);

  console.log(`✅ Loaded ${data.length} rows from ${sheetName}\n`);

  // Map company names to vendor slugs - handle patterns
  const getVendorSlug = (company: string): string | null => {
    if (company.includes("InstaPepz")) return "instapepz";
    if (company.includes("UAE Peptides")) return "uae-peptides";
    if (company.includes("Syncom")) return "syncom";
    return null;
  };

  const products: ExtractedProduct[] = data
    .map((row, index) => {
      try {
        const company = (row.Company || "").trim();
        const productName = (row.Product || "").trim();
        
        if (!company || !productName) {
          return null;
        }

        const vendorSlug = getVendorSlug(company);
        if (!vendorSlug) {
          console.warn(`⚠️  Row ${index + 1}: Unknown company "${company}"`);
          return null;
        }

        const price =
          typeof row.Price === "number"
            ? row.Price
            : typeof row.Price === "string"
              ? parseFloat(row.Price.replace(/[^\d.]/g, ""))
              : null;

        return {
          company,
          vendorSlug,
          productName,
          price: isNaN(price) || price < 0 ? null : price,
          currency: (row.Currency || "AED").trim(),
          category: (row["Collection/Category"] || "peptides").trim(),
          sourceUrl: (row["Source URL"] || "").trim(),
        };
      } catch (error) {
        console.error(`⚠️  Row ${index + 1} parsing error:`, error);
        return null;
      }
    })
    .filter((p): p is ExtractedProduct => p !== null);

  console.log(`✅ Parsed ${products.length} valid products\n`);
  return products;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function ensureVendor(slug: string, name: string) {
  await prisma.vendor.upsert({
    where: { slug },
    update: {
      status: "active",
    },
    create: {
      slug,
      name,
      status: "active",
      country: "AE",
      rating: 4.8,
      ratingCount: 500,
      isHouseBrand: false,
      complianceAccepted: true,
      complianceAcceptedAt: new Date(),
    },
  });
}

async function importProducts(allProducts: ExtractedProduct[]) {
  console.log("🔧 Importing into database...\n");

  // Ensure all vendors exist
  const vendorMap: { [key: string]: { slug: string; name: string } } = {
    instapepz: { slug: "instapepz", name: "InstaPepz" },
    "uae-peptides": { slug: "uae-peptides", name: "UAE Peptides Research" },
    syncom: { slug: "syncom", name: "Syncom" },
  };

  for (const vendor of Object.values(vendorMap)) {
    await ensureVendor(vendor.slug, vendor.name);
    console.log(`✅ Vendor ensured: ${vendor.name}`);
  }

  // Get vendor IDs
  const vendors = await prisma.vendor.findMany({
    where: {
      slug: { in: Object.keys(vendorMap) },
    },
  });

  const vendorIdMap: { [slug: string]: string } = {};
  vendors.forEach((v) => {
    vendorIdMap[v.slug] = v.id;
  });

  // Upsert products
  console.log("\n📦 Upserting products...\n");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of allProducts) {
    const vendorId = vendorIdMap[product.vendorSlug];
    if (!vendorId) {
      console.log(`  ⚠️  Skipping ${product.productName}: vendor ${product.vendorSlug} not found`);
      skipped++;
      continue;
    }

    const slug = generateProductSlug(product.vendorSlug, product.productName);
    const priceFils = product.price ? Math.round(product.price * 100) : 0;

    try {
      const result = await prisma.product.upsert({
        where: { slug },
        update: {
          priceFils,
          active: true,
          inStock: true,
          isGlobal: true,
        },
        create: {
          vendorId,
          name: product.productName,
          slug,
          description: `${product.category} peptide from ${product.company}`,
          category: "peptides",
          priceFils,
          imageUrl: null,
          active: true,
          inStock: true,
          isGlobal: true,
        },
      });

      const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
      if (isNew) {
        inserted++;
      } else {
        updated++;
      }
    } catch (error) {
      console.error(`  ❌ Error upserting ${slug}: ${error}`);
      errors++;
    }
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`  ✅ Inserted: ${inserted}`);
  console.log(`  🔄 Updated: ${updated}`);
  console.log(`  ⚠️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);

  // Final counts
  console.log(`\n📊 Final product counts by vendor:\n`);

  const vendorCounts: { [slug: string]: number } = {};

  for (const [slug, name] of Object.entries(vendorMap)) {
    const count = await prisma.product.count({
      where: {
        vendorId: vendorIdMap[slug],
        category: "peptides",
        active: true,
      },
    });
    vendorCounts[slug] = count;
    console.log(`  ${name}: ${count} products`);
  }

  const totalCount = await prisma.product.count({
    where: {
      category: "peptides",
      active: true,
    },
  });

  console.log(`\n  📈 TOTAL PEPTIDES: ${totalCount}`);

  // Count inquire-only products
  const inquireCount = await prisma.product.count({
    where: {
      category: "peptides",
      priceFils: 0,
      active: true,
    },
  });

  if (inquireCount > 0) {
    console.log(`  💬 Inquire-only products: ${inquireCount}`);
  }

  return { totalCount, vendorCounts };
}

// ============================================================================
// ROUTE VERIFICATION
// ============================================================================

async function verifyRoutes() {
  console.log("\n✅ VERIFYING ROUTES\n");

  const routes = [
    "/marketplace/peptides",
    "/shop/instapepz/peptides",
    "/shop/uae-peptides/peptides",
    "/shop/syncom/peptides",
  ];

  for (const route of routes) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://localhost:3000${route}`, {
        method: "HEAD",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.status === 200) {
        console.log(`  ✅ ${route}`);
      } else {
        console.log(`  ⚠️  ${route} (status: ${response?.status || "no response"})`);
      }
    } catch (error) {
      console.log(`  ❌ ${route} (error: ${error})`);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("🚀 PEPTIDE IMPORT FROM EXCEL\n");
  console.log("=".repeat(60) + "\n");

  try {
    // Phase 1: Read Excel file
    console.log("PHASE 1: READING EXCEL FILE\n");
    const excelPath = path.resolve(
      "/Users/cruzfrangieh/Desktop/instaxhealth website/peptides_products_extract.xlsx"
    );
    const allProducts = await readExcelFile(excelPath);

    // Phase 2: Import to database
    console.log("PHASE 2: IMPORTING TO DATABASE\n");
    const { totalCount } = await importProducts(allProducts);

    // Phase 3: Verify routes
    console.log("\nPHASE 3: VERIFYING ROUTES");
    await verifyRoutes();

    console.log("\n" + "=".repeat(60));
    console.log(
      `\n✅ PEPTIDE IMPORT COMPLETE\n   Total peptides in marketplace: ${totalCount}\n`
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
