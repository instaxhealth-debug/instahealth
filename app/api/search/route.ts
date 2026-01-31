import algoliasearch from "algoliasearch";
import { NextResponse } from "next/server";

const appId = process.env.ALGOLIA_APP_ID;
const searchKey = process.env.ALGOLIA_SEARCH_KEY;
const indexName = process.env.ALGOLIA_PRODUCTS_INDEX;

if (!appId || !searchKey || !indexName) {
  throw new Error("Missing ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY, or ALGOLIA_PRODUCTS_INDEX");
}

const client = algoliasearch(appId, searchKey);
const index = client.initIndex(indexName);

function quote(value: string) {
  return `"${value.replace(/"/g, "")}"`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category");
  const vendorId = searchParams.get("vendorId");
  const locationId = searchParams.get("locationId");

  const filters: string[] = ["active:true", "published:true"];

  if (category) {
    filters.push(`category:${quote(category)}`);
  }

  if (vendorId) {
    filters.push(`vendorId:${quote(vendorId)}`);
  }

  if (locationId) {
    filters.push(`locationIds:${quote(locationId)}`);
  }

  const res = await index.search(q, {
    hitsPerPage: 20,
    filters: filters.join(" AND "),
  });

  return NextResponse.json(res);
}