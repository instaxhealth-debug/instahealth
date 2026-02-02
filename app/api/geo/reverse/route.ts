import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/geo/reverse
 * Reverse geocode lat/lng to formatted address using Google Geocoding API
 * Used when user drops a pin on the map
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "lat and lng must be numbers" },
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

    console.log("[ReverseGeocode] Resolving", lat, lng);

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${serverKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding API failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.log("[ReverseGeocode] No results:", data.status);
      return NextResponse.json(
        { error: "No address found for these coordinates" },
        { status: 400 }
      );
    }

    const result = data.results[0];
    const formattedAddress = result.formatted_address;

    // Extract components
    let city = "";
    let state = "";
    let country = "";
    let postalCode = "";

    for (const component of result.address_components) {
      const types = component.types;
      if (types.includes("locality")) {
        city = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        state = component.long_name;
      }
      if (types.includes("country")) {
        country = component.long_name;
      }
      if (types.includes("postal_code")) {
        postalCode = component.long_name;
      }
    }

    console.log("[ReverseGeocode] Success:", formattedAddress);

    return NextResponse.json({
      formattedAddress,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      city,
      state,
      country,
      postalCode,
    });
  } catch (error: any) {
    console.error("[ReverseGeocode] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to reverse geocode" },
      { status: 500 }
    );
  }
}
