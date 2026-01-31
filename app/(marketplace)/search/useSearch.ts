"use client";

import { useEffect, useRef, useState } from "react";

export type AlgoliaSearchResponse<T> = {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
};

export interface UseSearchOptions {
  q: string;
  category?: string;
  vendorId?: string;
  locationId?: string;
}

export function useSearch(options: UseSearchOptions) {
  const { q, category, vendorId, locationId } = options;
  const [data, setData] = useState<AlgoliaSearchResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = (query: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ q: query });
    if (category) params.append("category", category);
    if (vendorId) params.append("vendorId", vendorId);
    if (locationId) params.append("locationId", locationId);

    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Search failed");
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((err: any) => {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Search failed");
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const trimmed = q.trim();

    if (trimmed.length < 2) {
      if (abortRef.current) abortRef.current.abort();
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(trimmed);
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [q, category, vendorId, locationId]);

  const empty = Boolean(data && data.hits && data.hits.length === 0);

  const refetch = () => {
    const trimmed = q.trim();
    if (trimmed.length >= 2) {
      fetchResults(trimmed);
    }
  };

  return { data, loading, error, empty, refetch };
}