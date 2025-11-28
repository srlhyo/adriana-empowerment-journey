import { NextResponse } from "next/server";
import { getGoogleConfig, createOAuthClient } from "../../_lib/google";

export function GET() {
  try {
    const config = getGoogleConfig();
    const client = createOAuthClient(config);

    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("OAuth login failed", message);
    return NextResponse.json(
      {
        error: "OAuth login failed",
        detail: message,
      },
      { status: 500 },
    );
  }
}
