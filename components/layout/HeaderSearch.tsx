"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearch } from "@/app/(marketplace)/search/useSearch";

type ProductSearchHit = {
  objectID: string;
  slug: string;
  name: string;
  description?: string;
  vendorName: string;
  price: number;
  currency: string;
};

interface HeaderSearchProps {
  className?: string;
  onSearch?: (query: string) => void;
  isMobile?: boolean;
}

export function HeaderSearch({ className, onSearch, isMobile }: HeaderSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, empty, refetch } = useSearch({ q: query });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    onSearch?.(value);
  };

  const results = data?.hits || [];

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
          onFocus={() => setIsOpen(true)}
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
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4 text-gray-600" />
          </Button>
        )}
      </div>

      {isOpen && (query || results.length > 0 || loading) && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {query.trim().length < 2 ? (
            <div className="p-6 text-center text-sm text-gray-500">Start typing…</div>
          ) : loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-3">
                  <div className="h-3 w-24 bg-gray-100 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-gray-100 rounded mb-1" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-gray-500">
              <div className="mb-3">Search failed. Please try again.</div>
              <Button size="sm" variant="outline" onClick={refetch}>
                Retry
              </Button>
            </div>
          ) : empty ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-96 overflow-y-auto p-2">
              {results.map((result, idx) => (
                <Link
                  key={result.objectID || idx}
                  href={`/product/${result.slug}`}
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
                            Product
                          </span>
                          <span className="text-xs text-gray-500">{result.vendorName}</span>
                        </div>
                        <p className="text-sm font-medium line-clamp-1 text-gray-900">{result.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          {result.description}
                        </p>
                        <p className="text-xs font-medium text-[#41a59b] mt-1">
                          View product →
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
