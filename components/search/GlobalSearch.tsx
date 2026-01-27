"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { SearchResult } from "@/types";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    // TODO: Integrate Algolia search
    // Placeholder for now
    setTimeout(() => {
      setResults([]);
      setIsLoading(false);
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  };

  const getItemUrl = (result: SearchResult) => {
    if (result.type === "product") {
      return `/pepz/products/${result.item.slug}`;
    } else if (result.type === "service") {
      return `/ivz/services/${result.item.slug}`;
    } else {
      return `/bloodz/tests/${result.item.slug}`;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products, IV drips, blood tests..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query && setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (query || results.length > 0 || isLoading) && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-md border bg-background shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-96 overflow-y-auto p-2">
              {results.map((result, idx) => (
                <Link
                  key={idx}
                  href={getItemUrl(result)}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="flex items-start gap-3 rounded-md p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">
                        {result.type === "product"
                          ? "Product"
                          : result.type === "service"
                          ? "IV Service"
                          : "Blood Test"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {result.vertical === "pepz"
                          ? "InstaPepz"
                          : result.vertical === "ivz"
                          ? "InstaIVZ"
                          : "InstaBloodz"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{result.item.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {result.item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

