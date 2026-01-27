"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { mockIVServices, mockBloodTests } from "@/lib/data/mock-data";
import type { SearchResult, Item } from "@/types";
import type { StorefrontProduct } from "@/lib/api/products";

interface HeaderSearchProps {
  className?: string;
  onSearch?: (query: string) => void;
  isMobile?: boolean;
}

export function HeaderSearch({ className, onSearch, isMobile }: HeaderSearchProps) {
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
    onSearch?.(searchQuery);

    // TODO: Replace with Algolia search
    // For now, search Prisma products and mock services/tests
    try {
      const lowerQuery = searchQuery.toLowerCase();
      
      // Fetch products from Prisma
      const productsResponse = await fetch("/api/products");
      let productResults: SearchResult[] = [];
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        productResults = productsData
          .filter(
            (p: Item) =>
              p.name.toLowerCase().includes(lowerQuery) ||
              (p.description && p.description.toLowerCase().includes(lowerQuery))
          )
          .map((item: Item) => ({
            item: item,
            type: "product" as const,
            vertical: "pepz" as const,
            relevance: 1,
          }));
      }

      const serviceResults = mockIVServices
        .filter(
          (s) =>
            s.name.toLowerCase().includes(lowerQuery) ||
            s.description.toLowerCase().includes(lowerQuery)
        )
        .map((item) => ({
          item: item as Item,
          type: "service" as const,
          vertical: "ivz" as const,
          relevance: 1,
        }));

      const testResults = mockBloodTests
        .filter(
          (t) =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery)
        )
        .map((item) => ({
          item: item as Item,
          type: "test" as const,
          vertical: "bloodz" as const,
          relevance: 1,
        }));

      setResults([...productResults, ...serviceResults, ...testResults]);
    } catch (error) {
      console.error("Error searching:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
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

  const getActionLabel = (result: SearchResult) => {
    if (result.type === "product") return "Add to cart";
    return "Book now";
  };

  return (
    <div ref={searchRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className={cn(
          "absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2",
          isMobile ? "text-gray-400" : "text-[#6B7280]"
        )} />
        <Input
          type="search"
          placeholder={isMobile ? "Search products…" : "Search for products, IV drips, blood tests…"}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query && setIsOpen(true)}
          className={cn(
            "pl-12 pr-10 rounded-full border focus:ring-2 focus:border-transparent",
            isMobile 
              ? "h-11 border-gray-300 bg-white/95 text-gray-900 placeholder:text-gray-500 focus:ring-gray-300"
              : "h-12 border-[#E5E7EB] bg-white text-[#111827] placeholder:text-gray-400 focus:ring-gray-300 shadow-md"
          )}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full hover:bg-gray-100"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4 text-gray-600" />
          </Button>
        )}
      </div>

      {isOpen && (query || results.length > 0 || isLoading) && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
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
                >
                  <Card className="p-3 hover:bg-gray-50 transition-colors cursor-pointer border-gray-200 mb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#41a59b] bg-[#41a59b]/10 px-2 py-0.5 rounded-md">
                            {result.type === "product"
                              ? "Product"
                              : result.type === "service"
                              ? "IV Service"
                              : "Blood Test"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {result.vertical === "pepz"
                              ? "InstaPepz"
                              : result.vertical === "ivz"
                              ? "InstaIVZ"
                              : "InstaBloodz"}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-clamp-1 text-gray-900">{result.item.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          {result.item.description}
                        </p>
                        <p className="text-xs font-medium text-[#41a59b] mt-1">
                          {getActionLabel(result)} →
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
