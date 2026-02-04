import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { PersonalDetailsForm } from "@/components/account/PersonalDetailsForm";

export default async function PersonalDetailsPage() {
  // Auth check - redirect if not authenticated
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Fetch current user data from database with error handling
  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        name: true,
        email: true,
        phone: true,
        countryCode: true,
      },
    });
  } catch (error) {
    console.error("[PersonalDetailsPage] Failed to fetch user:", error);
    // Database error - redirect to login with a graceful fallback
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  // Prepare initial form data
  const initialData = {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    countryCode: user.countryCode || "+971",
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        {/* Desktop: 2-column grid, Mobile: single column */}
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-10">
          {/* Left sidebar */}
          <AccountSidebar activeItem="personal-details" />

          {/* Right content */}
          <div>
            <PersonalDetailsForm initialData={initialData} />
          </div>
        </div>
      </div>
    </div>
  );
}
