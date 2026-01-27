"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

interface ShopDirectoryFiltersProps {
  tabs: FilterTab[];
  category: string;
}

export function ShopDirectoryFilters({ tabs, category }: ShopDirectoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("filter") || "all";

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams);
    if (tabId === "all") {
      params.delete("filter");
    } else {
      params.set("filter", tabId);
    }
    router.push(`/marketplace/${category}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "outline"}
          size="sm"
          onClick={() => handleTabChange(tab.id)}
          className={cn(
            "rounded-full whitespace-nowrap",
            activeTab === tab.id && "bg-[#41a59b] text-white hover:bg-[#41a59b]/90"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
          )}
        </Button>
      ))}
    </div>
  );
}
