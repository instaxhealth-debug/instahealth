import algoliasearch from "algoliasearch";
import type { SearchResult, Item } from "@/types";

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || ""
);

const index = client.initIndex("instahealth_items");

export async function searchItems(query: string, location?: { latitude: number; longitude: number }): Promise<SearchResult[]> {
  try {
    const searchParams: any = {
      hitsPerPage: 20,
      attributesToRetrieve: ["*"],
    };

    // Add location-based filtering if available
    if (location) {
      searchParams.aroundLatLng = `${location.latitude},${location.longitude}`;
      searchParams.aroundRadius = 50000; // 50km radius
    }

    const { hits } = await index.search(query, searchParams);

    return hits.map((hit: any) => ({
      item: hit as Item,
      type: hit.type,
      vertical: hit.vertical,
      relevance: hit._score || 0,
    }));
  } catch (error) {
    console.error("Algolia search error:", error);
    // Fallback to empty results
    return [];
  }
}

export async function indexItem(item: Item) {
  try {
    await index.saveObject({
      objectID: item.id,
      ...item,
    });
  } catch (error) {
    console.error("Algolia indexing error:", error);
    throw error;
  }
}

export async function indexItems(items: Item[]) {
  try {
    await index.saveObjects(items.map((item) => ({
      objectID: item.id,
      ...item,
    })));
  } catch (error) {
    console.error("Algolia batch indexing error:", error);
    throw error;
  }
}

