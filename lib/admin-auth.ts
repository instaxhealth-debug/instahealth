import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

async function getSession() {
  try {
    return await auth();
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export async function requireAdmin() {
  // Validate ADMIN_EMAIL is set
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!adminEmail) {
    throw new Error(
      "❌ ADMIN_EMAIL environment variable is not set. Admin access is disabled for security."
    );
  }

  const session = await getSession();
  
  if (!session?.user?.email) {
    redirect("/login?next=/admin");
  }

  // Strict single-admin-email access: only this email can access /admin
  const normalizedSessionEmail = session.user.email.toLowerCase().trim();
  
  if (normalizedSessionEmail !== adminEmail) {
    console.warn(
      `[AUTH] Unauthorized admin access attempt by: ${normalizedSessionEmail}`
    );
    redirect("/my-account/personal-details");
  }

  return session;
}

export async function isAdmin(): Promise<boolean> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail) {
      return false;
    }

    const session = await getSession();
    
    if (!session?.user?.email) {
      return false;
    }

    const normalizedSessionEmail = session.user.email.toLowerCase().trim();
    return normalizedSessionEmail === adminEmail;
  } catch {
    return false;
  }
}
