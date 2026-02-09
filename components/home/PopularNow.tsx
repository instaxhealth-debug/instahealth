import { SectionHeader } from "@/components/ui/SectionHeader";
import { OfferingCard } from "@/components/marketplace/OfferingCard";
import type { Offering } from "@/types/offering";

interface PopularNowProps {
  offerings: Offering[];
}

export function PopularNow({ offerings }: PopularNowProps) {
  return (
    <section>
      <SectionHeader title="Popular right now" action={{ label: "View all", href: "/marketplace/peptides" }} />
      {offerings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {offerings.map((offering) => (
            <div key={offering.id} className="flex-shrink-0 w-48">
              <OfferingCard offering={offering} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
