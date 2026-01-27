import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type LocationOption = {
  id: string;
  name: string;
  slug: string;
};

export async function getActiveLocations(): Promise<LocationOption[]> {
  noStore();
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
  return locations;
}

export async function getSelectedLocation(): Promise<LocationOption | null> {
  noStore();
  const cookieStore = cookies();
  const cookieLocationId = cookieStore.get("selectedLocationId")?.value;

  // 1) Cookie if present and active
  if (cookieLocationId) {
    const location = await prisma.location.findFirst({
      where: { id: cookieLocationId, isActive: true },
      select: { id: true, name: true, slug: true },
    });
    if (location) return location;
    // Cookie points to inactive/deleted location - will fallback to user default or first active
  }

  // 2) User default if logged in
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        defaultLocation: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });
    if (user?.defaultLocation && user.defaultLocation.isActive) {
      const { id, name, slug } = user.defaultLocation;
      return { id, name, slug };
    }
  }

  // 3) Fallback to first active location (e.g., Dubai)
  const fallback = await prisma.location.findFirst({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return fallback || null;
}

export async function getSelectedLocationId(): Promise<string | null> {
  const location = await getSelectedLocation();
  return location?.id ?? null;
}
