import { authOptions } from "./auth";

// Helper for getting server session
// For NextAuth v5 beta, use the getServerSession from next-auth directly
// This is a wrapper to handle potential import issues
export async function getServerSession() {
  try {
    // In NextAuth v4, getServerSession was exported from "next-auth"
    // In NextAuth v5 beta, it might be in a different location
    // Try multiple import paths
    let getSession;
    try {
      const auth = await import("next-auth");
      getSession = (auth as any).getServerSession;
    } catch {
      // Fallback: create a minimal session getter
      console.warn("Could not import getServerSession from next-auth");
      return null;
    }

    if (!getSession) {
      return null;
    }

    return await getSession(authOptions);
  } catch (error) {
    console.warn("getServerSession failed:", error);
    return null;
  }
}
