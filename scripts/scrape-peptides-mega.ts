import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

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
// SCRAPING FUNCTIONS
// ============================================================================

async function scrapeInstaPepz(): Promise<ExtractedProduct[]> {
  console.log("🔄 Scraping InstaPepz (JS-rendered)...");
  
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const products: ExtractedProduct[] = [];

  try {
    await page.goto("https://instapepzcom.abacusai.app/products", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for product cards
    await page.waitForSelector('[class*="product"]', { timeout: 10000 }).catch(() => {});

    const productData = await page.evaluate(() => {
      const items: any[] = [];
      // Look for product cards - adjust selector based on page structure
      const cards = document.querySelectorAll('[class*="card"], [class*="product-item"], article, [role="listitem"]');
      
      cards.forEach((card) => {
        const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="title"]');
        const priceEl = card.querySelector('[class*="price"], .price, span[class*="amount"]');
        
        if (nameEl && priceEl) {
          const name = nameEl.textContent?.trim() || "";
          const priceText = priceEl.textContent?.trim() || "";
          
          // Extract price number
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, "")) : null;
          
          if (name) {
            items.push({
              name,
              price,
              priceText,
            });
          }
        }
      });
      
      return items;
    });

    productData.forEach((item) => {
      products.push({
        company: "InstaPepz",
        vendorSlug: "instapepz",
        productName: item.name,
        price: item.price,
        currency: "AED",
        category: "peptides",
        sourceUrl: "https://instapepzcom.abacusai.app/products",
      });
    });

    console.log(`  ✅ InstaPepz: ${products.length} products`);
  } catch (error) {
    console.error(`  ❌ InstaPepz error: ${error}`);
  } finally {
    await browser.close();
  }

  return products;
}

async function scrapeUAEPeptides(): Promise<ExtractedProduct[]> {
  console.log("🔄 Scraping UAE Peptides Research (paginated)...");
  const products: ExtractedProduct[] = [];

  const urls = [
    "https://uaepeptidesresearch.com/product-category/uae-lab-research/",
    "https://uaepeptidesresearch.com/product-category/uae-lab-research/page/2/",
    "https://uaepeptidesresearch.com/product-category/uae-lab-research/page/3/",
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const html = await response.text();

      // Extract product names and prices from HTML
      const productRegex = /<h2[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h2>|<a[^>]*href="[^"]*"[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/a>/gi;
      const priceRegex = /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?(<bdi>)?[\s]*([^<]*?)[\s]*(<\/bdi>)?[\s]*<\/span>/gi;

      let productMatch;
      const productNames = new Set<string>();
      while ((productMatch = productRegex.exec(html)) !== null) {
        const name = (productMatch[1] || productMatch[2])?.trim();
        if (name && name.length > 2) {
          productNames.add(name);
        }
      }

      // Extract prices - more robust approach
      const priceMatches = html.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?<bdi>[\s]*([0-9,.]+)[\s]*<\/bdi>/gi) || [];
      const prices: number[] = [];
      priceMatches.forEach((match) => {
        const priceMatch = match.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          prices.push(parseFloat(priceMatch[0].replace(/,/g, "")));
        }
      });

      const namesArray = Array.from(productNames);
      for (let i = 0; i < namesArray.length; i++) {
        products.push({
          company: "UAE Peptides Research",
          vendorSlug: "uae-peptides",
          productName: namesArray[i],
          price: prices[i] || null,
          currency: "AED",
          category: "peptides",
          sourceUrl: url,
        });
      }

      console.log(`  ✅ Page (${url.split("/page/")[1] || "1"}): ${namesArray.length} products`);
    } catch (error) {
      console.error(`  ❌ UAE Peptides error (${url}): ${error}`);
    }
  }

  console.log(`  ✅ UAE Peptides Research total: ${products.length} products`);
  return products;
}

async function scrapeSyncom(): Promise<ExtractedProduct[]> {
  console.log("🔄 Scraping Syncom (paginated)...");
  const products: ExtractedProduct[] = [];

  const collections = [
    { url: "https://syncom.shop/collections/peptides?sort_by=manual&grid=zoom-out&page=2", type: "injectable" },
    { url: "https://syncom.shop/collections/oral-peptides", type: "oral" },
    { url: "https://syncom.shop/collections/nasal-peptides", type: "nasal" },
    { url: "https://syncom.shop/collections/peptide-pens", type: "pen" },
  ];

  for (const collection of collections) {
    try {
      const response = await fetch(collection.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const html = await response.text();

      // Extract product data from Shopify-style HTML
      const productRegex = /<a[^>]*class="[^"]*product-item[^"]*"[^>]*href="[^"]*"[^>]*>\s*<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>/gi;
      
      let match;
      let count = 0;
      while ((match = productRegex.exec(html)) !== null) {
        const name = match[1]?.trim() || "";
        const priceText = match[2]?.trim() || "";
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, "")) : null;

        if (name) {
          products.push({
            company: "Syncom",
            vendorSlug: "syncom",
            productName: name,
            price,
            currency: "AED",
            category: collection.type,
            sourceUrl: collection.url,
          });
          count++;
        }
      }

      console.log(`  ✅ ${collection.type}: ${count} products`);
    } catch (error) {
      console.error(`  ❌ Syncom error (${collection.type}): ${error}`);
    }
  }

  console.log(`  ✅ Syncom total: ${products.length} products`);
  return products;
}

// ============================================================================
// NORMALIZE & SLUG GENERATION
// ============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .substring(0, 100); // Limit length
}

function generateProductSlug(vendorSlug: string, productName: string): string {
  const nameSlug = slugify(productName);
  return `${vendorSlug}-${nameSlug}`;
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
  console.log("\n🔧 Importing into database...\n");

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

  for (const product of allProducts) {
    const vendorId = vendorIdMap[product.vendorSlug];
    if (!vendorId) {
      console.log(`  ⚠️  Skipping ${product.productName}: vendor not found`);
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
      skipped++;
    }
  }

  console.log(`\n✅ Inserted: ${inserted}`);
  console.log(`🔄 Updated: ${updated}`);
  console.log(`⚠️  Skipped: ${skipped}`);

  // Final counts
  console.log("\n📊 Final product counts by vendor:\n");

  for (const [slug, name] of Object.entries(vendorMap)) {
    const count = await prisma.product.count({
      where: {
        vendorId: vendorIdMap[slug],
        category: "peptides",
        active: true,
      },
    });
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
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("🚀 PEPTIDE MEGA SCRAPE + IMPORT\n");
  console.log("=".repeat(60) + "\n");

  try {
    // Phase 1: Scrape all sources
    console.log("PHASE 1: EXTRACTING DATA\n");
    
    const instapepzProducts = await scrapeInstaPepz();
    const uaePeptidesProducts = await scrapeUAEPeptides();
    const syncomProducts = await scrapeSyncom();

    const allProducts = [
      ...instapepzProducts,
      ...uaePeptidesProducts,
      ...syncomProducts,
    ];

    console.log(`\n✅ Total products extracted: ${allProducts.length}\n`);

    // Phase 2: Save extraction data
    console.log("PHASE 2: SAVING EXTRACTION DATA\n");
    
    const csv = [
      ["Company", "VendorSlug", "ProductName", "Price", "Currency", "Category", "SourceURL"].join(","),
      ...allProducts.map((p) =>
        [
          `"${p.company}"`,
          `"${p.vendorSlug}"`,
          `"${p.productName}"`,
          p.price || "NULL",
          `"${p.currency}"`,
          `"${p.category}"`,
          `"${p.sourceUrl}"`,
        ].join(",")
      ),
    ].join("\n");

    fs.writeFileSync(
      "/tmp/peptides-extraction.csv",
      csv
    );
    console.log("✅ Extraction data saved: /tmp/peptides-extraction.csv\n");

    // Phase 3: Import to database
    console.log("PHASE 3: IMPORTING TO DATABASE\n");
    await importProducts(allProducts);

    console.log("\n" + "=".repeat(60));
    console.log("✅ PEPTIDE IMPORT COMPLETE\n");

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
