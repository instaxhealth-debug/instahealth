import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering (uses cookies/headers via auth())
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Fetch current user's personal data preferences
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        heightCm: true,
        weightKg: true,
        consentShareBodyMetrics: true,
        marketingPushOptIn: true,
        marketingEmailOptIn: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      consentShareBodyMetrics: user.consentShareBodyMetrics,
      marketingPushOptIn: user.marketingPushOptIn,
      marketingEmailOptIn: user.marketingEmailOptIn,
    });
  } catch (error) {
    console.error("[API] GET /api/account/personal-data failed:", error);
    
    // Graceful DB failure - return safe defaults
    return NextResponse.json(
      {
        heightCm: null,
        weightKg: null,
        consentShareBodyMetrics: false,
        marketingPushOptIn: false,
        marketingEmailOptIn: false,
      },
      { status: 200 }
    );
  }
}

// POST: Update user's personal data preferences
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { heightCm, weightKg, consentShareBodyMetrics, marketingPushOptIn, marketingEmailOptIn } = body;

    // Validate marketing consent values
    if (typeof marketingPushOptIn !== "boolean" || typeof marketingEmailOptIn !== "boolean") {
      return NextResponse.json(
        { error: "Invalid marketing consent values" },
        { status: 400 }
      );
    }

    if (typeof consentShareBodyMetrics !== "boolean") {
      return NextResponse.json(
        { error: "Invalid body metrics consent value" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      consentShareBodyMetrics,
      marketingPushOptIn,
      marketingEmailOptIn,
    };

    // Only save height/weight if consent is given
    if (consentShareBodyMetrics) {
      // Validate inputs only if consent is given
      if (typeof heightCm !== "number" || heightCm < 100 || heightCm > 250) {
        return NextResponse.json(
          { error: "Invalid height value" },
          { status: 400 }
        );
      }

      if (typeof weightKg !== "number" || weightKg < 30 || weightKg > 200) {
        return NextResponse.json(
          { error: "Invalid weight value" },
          { status: 400 }
        );
      }

      updateData.heightCm = heightCm;
      updateData.weightKg = weightKg;
    } else {
      // If consent is revoked, clear body metrics
      updateData.heightCm = null;
      updateData.weightKg = null;
    }

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        heightCm: true,
        weightKg: true,
        consentShareBodyMetrics: true,
        marketingPushOptIn: true,
        marketingEmailOptIn: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[API] POST /api/account/personal-data failed:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
