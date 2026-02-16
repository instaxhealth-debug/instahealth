import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TIMEZONES = [
  "Asia/Dubai",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const VALID_LANGUAGES = ["en", "ar"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: true,
        marketingOptIn: true,
        timezone: true,
        language: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[SETTINGS_GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const updates: {
      emailNotificationsEnabled?: boolean;
      smsNotificationsEnabled?: boolean;
      marketingOptIn?: boolean;
      timezone?: string;
      language?: string;
    } = {};

    if (typeof body.emailNotificationsEnabled === "boolean") {
      updates.emailNotificationsEnabled = body.emailNotificationsEnabled;
    }

    if (typeof body.smsNotificationsEnabled === "boolean") {
      updates.smsNotificationsEnabled = body.smsNotificationsEnabled;
    }

    if (typeof body.marketingOptIn === "boolean") {
      updates.marketingOptIn = body.marketingOptIn;
    }

    if (typeof body.timezone === "string") {
      if (!VALID_TIMEZONES.includes(body.timezone)) {
        return NextResponse.json(
          { error: "Invalid timezone" },
          { status: 400 }
        );
      }
      updates.timezone = body.timezone;
    }

    if (typeof body.language === "string") {
      if (!VALID_LANGUAGES.includes(body.language)) {
        return NextResponse.json(
          { error: "Invalid language" },
          { status: 400 }
        );
      }
      updates.language = body.language;
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: updates,
      select: {
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: true,
        marketingOptIn: true,
        timezone: true,
        language: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("[SETTINGS_POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
