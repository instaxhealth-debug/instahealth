import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between mb-6", className)}>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && (
        <Link 
          href={action.href} 
          className="flex items-center gap-1 text-[#0F172A] hover:text-[#1E293B] hover:underline font-medium transition-all duration-200"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
