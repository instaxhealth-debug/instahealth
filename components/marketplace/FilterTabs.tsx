"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  activeTab: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function FilterTabs({ tabs, activeTab, onTabChange, className }: FilterTabsProps) {
  const handleTabChange = onTabChange ?? (() => {});

  return (
    <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide pb-2", className)}>
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
