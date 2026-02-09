import { SectionHeader } from "@/components/ui/SectionHeader";
import { OfferingCard } from "@/components/marketplace/OfferingCard";
import type { Offering } from "@/types/offering";

interface MostBookedProps {
  offerings: Offering[];
}

export function MostBooked({ offerings }: MostBookedProps) {
  return (
    <section>
      <SectionHeader title="Most booked this week" action={{ label: "View all", href: "/marketplace/iv-drips" }} />
      {offerings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings yet.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {offerings.map((offering) => (
            <div key={offering.id} className="flex-shrink-0 w-64">
              <OfferingCard offering={offering} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
