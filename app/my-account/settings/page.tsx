import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { SettingsForm } from "@/components/account/SettingsForm";

export default async function SettingsPage() {
  // Auth check - redirect if not authenticated
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?next=/my-account/settings");
  }

  // Fetch current user settings from database
  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: true,
        marketingOptIn: true,
        timezone: true,
        language: true,
      },
    });
  } catch (error) {
    console.error("[SettingsPage] Failed to fetch user settings:", error);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  // Prepare initial settings data
  const initialSettings = {
    emailNotificationsEnabled: user.emailNotificationsEnabled,
    smsNotificationsEnabled: user.smsNotificationsEnabled,
    marketingOptIn: user.marketingOptIn,
    timezone: user.timezone,
    language: user.language,
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        {/* Desktop: 2-column grid, Mobile: single column */}
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-10">
          {/* Left sidebar */}
          <AccountSidebar activeItem="settings" />

          {/* Right content */}
          <div>
            <SettingsForm initialSettings={initialSettings} />
          </div>
        </div>
      </div>
    </div>
  );
}
