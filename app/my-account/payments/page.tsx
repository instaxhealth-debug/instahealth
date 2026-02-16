import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { PaymentMethodsClient } from "@/components/account/PaymentMethodsClient";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?next=/my-account/payments");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-10">
          <AccountSidebar activeItem="payments" />
          <div>
            <PaymentMethodsClient />
          </div>
        </div>
      </div>
    </div>
  );
}
