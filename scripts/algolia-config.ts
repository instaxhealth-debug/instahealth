import algoliasearch from "algoliasearch";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

const appId = process.env.ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_KEY;
const indexName = process.env.ALGOLIA_PRODUCTS_INDEX;

if (!appId || !adminKey || !indexName) {
  throw new Error("Missing ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, or ALGOLIA_PRODUCTS_INDEX");
}

const client = algoliasearch(appId, adminKey);
const index = client.initIndex(indexName);

async function main() {
  await index.setSettings({
    searchableAttributes: [
      "name",
      "vendorName",
      "category",
      "tags",
      "unordered(description)",
    ],
    attributesForFaceting: [
      "filterOnly(category)",
      "filterOnly(vendorId)",
      "filterOnly(locationIds)",
      "filterOnly(citySlugs)",
      "filterOnly(active)",
      "filterOnly(published)",
      "filterOnly(vendorVerified)",
      "filterOnly(inventoryStatus)",
      "filterOnly(currency)",
    ],
    customRanking: [
      "desc(vendorVerifiedScore)",
      "desc(inventoryScore)",
      "desc(marginPct)",
      "desc(vendorRatingWeighted)",
      "desc(updatedAt)",
    ],
    typoTolerance: true,
    minWordSizefor1Typo: 4,
    minWordSizefor2Typos: 8,
    removeWordsIfNoResults: "lastWords",
    advancedSyntax: true,
    hitsPerPage: 20,
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Algolia settings applied to index: ${indexName}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Algolia config failed:", error);
  process.exit(1);
});