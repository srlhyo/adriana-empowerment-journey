import { NextRequest, NextResponse } from "next/server";
import {
  extractStoredTokens,
  getAuthorizedCalendar,
  getGoogleConfig,
  saveTokens,
} from "../../_lib/google";
import { bookings, db } from "@/db/client";

function validatePayload(payload: any) {
  const errors: string[] = [];
  if (!payload) {
    errors.push("Payload is missing");
    return errors;
  }

  if (!payload.start) {
    errors.push("start is required");
  }
  if (!payload.end) {
    errors.push("end is required");
  }
  if (!payload.summary) {
    errors.push("summary is required");
  }
  if (!payload.email || typeof payload.email !== "string") {
    errors.push("email is required");
  }
  if (payload.email && !payload.email.includes("@")) {
    errors.push("email must be valid");
  }
  if (!payload.name || typeof payload.name !== "string") {
    errors.push("name is required");
  }

  if (payload.start && Number.isNaN(new Date(payload.start).getTime())) {
    errors.push("start must be a valid ISO date string");
  }

  if (payload.end && Number.isNaN(new Date(payload.end).getTime())) {
    errors.push("end must be a valid ISO date string");
  }

  return errors;
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const errors = validatePayload(payload);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Invalid payload", details: errors },
      { status: 400 },
    );
  }

  const config = getGoogleConfig();

  try {
    const { calendar, authClient } = await getAuthorizedCalendar(config);
    const calendarId = config.calendarId || "primary";

    const event = {
      summary: payload.summary,
      description: payload.description || undefined,
      start: {
        dateTime: payload.start,
      },
      end: {
        dateTime: payload.end,
      },
      location: payload.location || undefined,
      attendees:
        payload.email
          ? [
              {
                email: payload.email,
                displayName: payload.name,
              },
            ]
          : undefined,
      extendedProperties: payload.metadata
        ? {
            private: Object.fromEntries(
              Object.entries(payload.metadata).map(([key, value]) => [
                key,
                typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2),
              ]),
            ),
          }
        : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: "all",
    });

    const stored = extractStoredTokens(authClient, config.adminEmail);
    if (stored) {
      await saveTokens(config, stored);
    }

    const startTime = new Date(payload.start);
    const endTime = new Date(payload.end);
    const serviceIdValue = payload.metadata?.serviceId ?? payload.serviceId;
    const parsedServiceId = Number.parseInt(serviceIdValue ?? "", 10);

    const locationLabel =
      typeof payload.location === "string"
        ? payload.location.toLowerCase()
        : "";

    const bookingRecord = {
      customerName: payload.name as string,
      customerEmail: payload.email as string,
      customerPhone: payload.phone ?? null,
      sessionType:
        payload.sessionType ||
        payload.metadata?.sessionType ||
        (locationLabel.includes("presencial")
          ? "Presencial"
          : "Online"),
      serviceId: Number.isNaN(parsedServiceId) ? null : parsedServiceId,
      serviceName: payload.summary ?? null,
      notes: payload.description ?? null,
      startTime,
      endTime,
      timeZone:
        payload.timeZone ||
        payload.metadata?.timezone ||
        config.defaultTimeZone,
      calendarEventId: response.data.id ?? null,
      calendarHtmlLink: response.data.htmlLink ?? null,
      status: response.data.status ?? "confirmed",
    };

    try {
      await db.insert(bookings).values(bookingRecord);
    } catch (dbError) {
      console.error("Booking persistence failed", dbError);
    }

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
    });
  } catch (error: any) {
    const status = error?.code || 500;
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("Event creation failed", {
      message,
      code: error?.code,
      detail: error?.cause?.message ?? error?.message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    let friendlyMessage = "Failed to create event";
    if (status === 401) {
      friendlyMessage =
        "Authentication failed. Re-authorize the Google Calendar integration.";
    } else if (status === 403) {
      friendlyMessage = "Permission denied. Check Google Calendar API access.";
    } else if (status === 429) {
      friendlyMessage = "Too many requests. Try again later.";
    } else if (status === 400) {
      friendlyMessage = "Invalid event data. Please review the booking details.";
    }

    return NextResponse.json(
      {
        success: false,
        error: friendlyMessage,
        details: message,
        code: status,
      },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
