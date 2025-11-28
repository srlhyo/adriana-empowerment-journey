import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthClient,
  extractStoredTokens,
  getGoogleConfig,
  saveTokens,
} from "../../_lib/google";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: "OAuth error", detail: error },
      { status: 400 },
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 },
    );
  }

  try {
    const config = getGoogleConfig();
    const client = createOAuthClient(config);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || config.adminEmail || "Unknown";

    const stored = extractStoredTokens(client, email);
    if (stored) {
      await saveTokens(config, stored);
    }

    const refreshHtml = stored?.refreshToken
      ? `
        <p><strong>Refresh Token:</strong></p>
        <pre style="white-space: pre-wrap; word-break: break-all; border: 1px solid #ccc; padding: 12px; background: #f9f9f9;">${stored.refreshToken}</pre>
        <p>Store this value securely (e.g., Vercel env var <code>GOOGLE_REFRESH_TOKEN</code>).</p>
      `
      : `
        <p><strong>No refresh token was returned.</strong></p>
        <p>If you have authorized this client before, Google might omit the refresh token. Try revoking access and reauthorizing with <code>prompt=consent</code>.</p>
      `;

    const responseHtml = `
      <html>
        <head>
          <title>Authorization Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 720px; margin: 60px auto; text-align: center;">
          <h1>✅ Authorization Successful</h1>
          <p>Authorization completed for <strong>${email}</strong>.</p>
          <div style="text-align: left; margin-top: 32px;">
            ${refreshHtml}
          </div>
          <p>You can close this window.</p>
        </body>
      </html>
    `;

    return new NextResponse(responseHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const errorHtml = `
      <html>
        <head>
          <title>Authorization Failed</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 720px; margin: 60px auto; text-align: center;">
          <h1>❌ Authorization Failed</h1>
          <p>${message}</p>
          <p>Check the server logs for more details.</p>
        </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
