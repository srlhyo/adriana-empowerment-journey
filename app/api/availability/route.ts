import { NextRequest, NextResponse } from "next/server";
import {
  extractStoredTokens,
  getAuthorizedCalendar,
  getGoogleConfig,
  saveTokens,
} from "../_lib/google";
import {
  addMinutes,
  computeSlotsForDate,
  getScheduleConfig,
} from "../_lib/schedule";

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const dateInput = body?.date;
  const requestTimeZone = body?.timeZone;

  if (!dateInput) {
    return NextResponse.json(
      { error: "Date parameter is required" },
      { status: 400 },
    );
  }

  const requestDate = new Date(dateInput);
  if (Number.isNaN(requestDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date provided" },
      { status: 400 },
    );
  }

  const config = getGoogleConfig();
  const timeZone = requestTimeZone || config.defaultTimeZone;
  const schedule = getScheduleConfig();

  try {
    const { calendar, authClient } = await getAuthorizedCalendar(config);
    const calendarId = config.calendarId || "primary";

    const busyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay(requestDate).toISOString(),
        timeMax: endOfDay(requestDate).toISOString(),
        timeZone,
        items: [{ id: calendarId }],
      },
    });

    const busySlots: Array<{ start: Date; end: Date }> = [];
    const calendars = busyResponse.data.calendars || {};
    Object.values(calendars).forEach((calendarInfo) => {
      calendarInfo?.busy?.forEach((slot) => {
        if (slot.start && slot.end) {
          busySlots.push({
            start: new Date(slot.start),
            end: new Date(slot.end),
          });
        }
      });
    });

    const candidateSlots = computeSlotsForDate(requestDate);

    const availableTimes = candidateSlots.filter((timeString) => {
      const [hours, minutes] = timeString.split(":").map((part) => parseInt(part, 10));
      const slotStart = new Date(requestDate);
      slotStart.setHours(hours, minutes, 0, 0);
      const slotEnd = addMinutes(slotStart, schedule.slotMinutes);

      return !busySlots.some((busy) => {
        return slotStart < busy.end && slotEnd > busy.start;
      });
    });

    const stored = extractStoredTokens(authClient, config.adminEmail);
    if (stored) {
      await saveTokens(config, stored);
    }

    return NextResponse.json({
      success: true,
      date: dateInput,
      timeZone,
      availableTimes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Availability check failed", message);

    const fallbackTimes = computeSlotsForDate(requestDate);

    return NextResponse.json({
      success: true,
      date: dateInput,
      timeZone,
      availableTimes: fallbackTimes,
      fallback: true,
      error: message,
    });
  }
}
