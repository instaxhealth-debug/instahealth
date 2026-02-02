import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/ui/LogoutButton";
import Link from "next/link";

export default async function AccountPage() {
  const session = await auth();

  if (!session) {
    redirect("/login?next=/account");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-lg font-medium">{session?.user?.email || "N/A"}</p>
            </div>
            {session?.user?.name && (
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-lg font-medium">{session.user.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/orders">
                <span>View Orders</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/cart">
                <span>View Cart</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/account/addresses">
                <span>Saved Addresses</span>
              </Link>
            </Button>
            <SignOutButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
