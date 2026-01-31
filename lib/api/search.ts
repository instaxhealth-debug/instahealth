import type { SearchResult } from "@/types";

export async function searchItems(query: string): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({ q: query });
    const res = await fetch(`/api/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.hits || []).map((hit: any) => ({
      item: hit,
      type: "product",
      vertical: "pepz",
      relevance: 0,
    }));
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

