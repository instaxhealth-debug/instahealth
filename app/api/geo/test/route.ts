import { NextResponse } from "next/server";
import { haversineKm, assertAddressInVendorRadius } from "@/server/services/geo";

/**
 * Test route for geo validation
 * GET /api/geo/test
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Test haversine calculation
  // Dubai coordinates: 25.2048, 55.2708
  // Abu Dhabi coordinates: 24.4539, 54.3773
  const dubaiLat = 25.2048;
  const dubaiLng = 55.2708;
  const abuDhabiLat = 24.4539;
  const abuDhabiLng = 54.3773;

  const distanceDubaiToAbuDhabi = haversineKm(
    dubaiLat,
    dubaiLng,
    abuDhabiLat,
    abuDhabiLng
  );

  // Test 1: Within radius (should pass)
  const test1Vendor = {
    id: "test-vendor-1",
    name: "Test Vendor Dubai",
    enforceServiceRadius: true,
    baseLat: dubaiLat,
    baseLng: dubaiLng,
    serviceRadiusKm: 10,
    allowOutOfRadiusOverride: false,
  };

  // Address within 5km of Dubai center
  const nearbyLat = 25.21;
  const nearbyLng = 55.28;

  let test1Result = "PASS";
  try {
    assertAddressInVendorRadius({
      vendor: test1Vendor,
      addressLat: nearbyLat,
      addressLng: nearbyLng,
    });
  } catch (error: any) {
    test1Result = `FAIL: ${error.message}`;
  }

  // Test 2: Outside radius (should fail)
  let test2Result = "FAIL: Should have thrown OUT_OF_RADIUS";
  try {
    assertAddressInVendorRadius({
      vendor: test1Vendor,
      addressLat: abuDhabiLat,
      addressLng: abuDhabiLng,
    });
  } catch (error: any) {
    if (error.code === "OUT_OF_RADIUS") {
      test2Result = `PASS: ${error.message}`;
    } else {
      test2Result = `FAIL: Wrong error code ${error.code}`;
    }
  }

  // Test 3: No base location set (should fail with VENDOR_BASE_NOT_SET)
  const test3Vendor = {
    id: "test-vendor-3",
    name: "Test Vendor No Base",
    enforceServiceRadius: true,
    baseLat: null,
    baseLng: null,
    serviceRadiusKm: 10,
    allowOutOfRadiusOverride: false,
  };

  let test3Result = "FAIL: Should have thrown VENDOR_BASE_NOT_SET";
  try {
    assertAddressInVendorRadius({
      vendor: test3Vendor,
      addressLat: dubaiLat,
      addressLng: dubaiLng,
    });
  } catch (error: any) {
    if (error.code === "VENDOR_BASE_NOT_SET") {
      test3Result = `PASS: ${error.message}`;
    } else {
      test3Result = `FAIL: Wrong error code ${error.code}`;
    }
  }

  // Test 4: Enforcement disabled (should pass)
  const test4Vendor = {
    id: "test-vendor-4",
    name: "Test Vendor No Enforcement",
    enforceServiceRadius: false,
    baseLat: dubaiLat,
    baseLng: dubaiLng,
    serviceRadiusKm: 5,
    allowOutOfRadiusOverride: false,
  };

  let test4Result = "PASS";
  try {
    assertAddressInVendorRadius({
      vendor: test4Vendor,
      addressLat: abuDhabiLat, // Far away but enforcement disabled
      addressLng: abuDhabiLng,
    });
  } catch (error: any) {
    test4Result = `FAIL: ${error.message}`;
  }

  // Test 5: Admin override (should pass)
  const test5Vendor = {
    id: "test-vendor-5",
    name: "Test Vendor With Override",
    enforceServiceRadius: true,
    baseLat: dubaiLat,
    baseLng: dubaiLng,
    serviceRadiusKm: 5,
    allowOutOfRadiusOverride: true,
  };

  let test5Result = "PASS";
  try {
    assertAddressInVendorRadius({
      vendor: test5Vendor,
      addressLat: abuDhabiLat,
      addressLng: abuDhabiLng,
      isAdminOverride: true, // Should allow despite distance
    });
  } catch (error: any) {
    test5Result = `FAIL: ${error.message}`;
  }

  return NextResponse.json({
    distanceCalculation: {
      description: "Dubai to Abu Dhabi",
      distanceKm: Math.round(distanceDubaiToAbuDhabi * 10) / 10,
      expectedRangeKm: "130-150",
    },
    tests: {
      test1_within_radius: test1Result,
      test2_outside_radius: test2Result,
      test3_no_base_location: test3Result,
      test4_enforcement_disabled: test4Result,
      test5_admin_override: test5Result,
    },
    summary: {
      allTestsPassed:
        test1Result === "PASS" &&
        test2Result.startsWith("PASS") &&
        test3Result.startsWith("PASS") &&
        test4Result === "PASS" &&
        test5Result === "PASS",
    },
  });
}
