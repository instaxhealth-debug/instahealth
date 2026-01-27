import { redirect } from "next/navigation";
import { auth } from "./auth";

async function getSession() {
  try {
    return await auth();
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    redirect("/login?next=/admin");
  }

  const isAdmin =
    session.user.role === "ADMIN" ||
    (!!process.env.ADMIN_EMAIL && session.user.email === process.env.ADMIN_EMAIL);

  if (!isAdmin) {
    redirect("/account");
  }

  return session;
}

export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getSession();
    
    if (!session?.user?.email) {
      return false;
    }

    return (
      session.user.role === "ADMIN" ||
      (!!process.env.ADMIN_EMAIL && session.user.email === process.env.ADMIN_EMAIL)
    );
  } catch {
    return false;
  }
}
