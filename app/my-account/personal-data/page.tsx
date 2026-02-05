import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { PersonalDataClient } from "@/components/account/PersonalDataClient";

export default async function PersonalDataPage() {
  // Auth check - redirect if not authenticated
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Fetch current user data with error handling
  let userData = {
    heightCm: null as number | null,
    weightKg: null as number | null,
    consentShareBodyMetrics: false,
    marketingPushOptIn: false,
    marketingEmailOptIn: false,
  };

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        heightCm: true,
        weightKg: true,
        consentShareBodyMetrics: true,
        marketingPushOptIn: true,
        marketingEmailOptIn: true,
      },
    });

    if (user) {
      userData = {
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        consentShareBodyMetrics: user.consentShareBodyMetrics,
        marketingPushOptIn: user.marketingPushOptIn,
        marketingEmailOptIn: user.marketingEmailOptIn,
      };
    }
  } catch (error) {
    console.error("[PersonalDataPage] Failed to fetch user data:", error);
    // Continue with safe defaults - page still renders
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        {/* Desktop: 2-column grid, Mobile: single column */}
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-10">
          {/* Left sidebar */}
          <AccountSidebar activeItem="personal-data" />

          {/* Right content */}
          <div>
            <PersonalDataClient initialData={userData} />
          </div>
        </div>
      </div>
    </div>
  );
}
