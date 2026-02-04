import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AccountPage() {
  const session = await auth();

  if (session?.user?.email) {
    redirect("/my-account/personal-details");
  } else {
    redirect("/login");
  }
}

