import { prisma } from "./prisma";

/**
 * Get default address for a user
 */
export async function getDefaultAddress(userId: string) {
  return await prisma.address.findFirst({
    where: {
      userId,
      isDefault: true,
    },
    select: {
      id: true,
      label: true,
      phone: true,
      line1: true,
      line2: true,
      area: true,
      city: true,
      emirate: true,
      instructions: true,
      lat: true,
      lng: true,
      placeId: true,
      formattedAddress: true,
      isDefault: true,
    },
  });
}

/**
 * Get all addresses for a user
 */
export async function getAllAddresses(userId: string) {
  return await prisma.address.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      label: true,
      phone: true,
      line1: true,
      line2: true,
      area: true,
      city: true,
      emirate: true,
      instructions: true,
      lat: true,
      lng: true,
      placeId: true,
      formattedAddress: true,
      isDefault: true,
    },
    orderBy: [
      { isDefault: "desc" }, // Default first
      { createdAt: "desc" }, // Then newest
    ],
  });
}

/**
 * Get a specific address by ID (with ownership check)
 */
export async function getAddress(addressId: string, userId: string) {
  return await prisma.address.findFirst({
    where: {
      id: addressId,
      userId, // Ownership check
    },
    select: {
      id: true,
      label: true,
      phone: true,
      line1: true,
      line2: true,
      area: true,
      city: true,
      emirate: true,
      instructions: true,
      lat: true,
      lng: true,
      placeId: true,
      formattedAddress: true,
      isDefault: true,
    },
  });
}
