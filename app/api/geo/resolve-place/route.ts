import { NextResponse } from "next/server";
import { createNormalizedAddressHash } from "@/server/services/geo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { placeId } = body;

    if (!placeId || typeof placeId !== "string") {
      return NextResponse.json(
        { error: "placeId is required" },
        { status: 400 }
      );
    }

    const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json(
        { error: "GOOGLE_MAPS_SERVER_KEY not configured" },
        { status: 500 }
      );
    }

    // Call Google Places Details API (server-side, using server key)
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=formatted_address,geometry,address_components&key=${serverKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      return NextResponse.json(
        { error: `Google Places API error: ${data.status}` },
        { status: 400 }
      );
    }

    const result = data.result;
    const geometry = result.geometry;
    const addressComponents = result.address_components || [];

    // Extract components
    const components: {
      city: string | null;
      state: string | null;
      country: string | null;
      postalCode: string | null;
    } = {
      city: null,
      state: null,
      country: null,
      postalCode: null,
    };

    for (const component of addressComponents) {
      const types = component.types;
      if (types.includes("locality")) {
        components.city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        components.state = component.short_name;
      } else if (types.includes("country")) {
        components.country = component.short_name;
      } else if (types.includes("postal_code")) {
        components.postalCode = component.long_name;
      }
    }

    const formattedAddress = result.formatted_address;
    const lat = geometry.location.lat;
    const lng = geometry.location.lng;

    // Create normalized hash for deduplication
    const normalizedHash = createNormalizedAddressHash(
      formattedAddress,
      components.postalCode,
      components.country
    );

    return NextResponse.json({
      formattedAddress,
      lat,
      lng,
      components,
      normalizedHash,
      placeId,
    });
  } catch (error: any) {
    console.error("Error resolving place:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resolve place" },
      { status: 500 }
    );
  }
}
