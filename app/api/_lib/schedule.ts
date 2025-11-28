const DAY_MAP: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export type WorkingScheduleConfig = {
  workingDays: Set<number>;
  slotMinutes: number;
  periods: Array<{ startMinutes: number; endMinutes: number }>;
};

function parseWorkingDays(): Set<number> {
  const envValue = (process.env.WORKING_DAYS || "MON-FRI").toUpperCase();
  const parts = envValue.split(/[,\s]+/).filter(Boolean);
  const days = new Set<number>();

  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-");
      const startIdx = DAY_MAP[start];
      const endIdx = DAY_MAP[end];
      if (startIdx === undefined || endIdx === undefined) continue;
      let current = startIdx;
      while (true) {
        days.add(current);
        if (current === endIdx) break;
        current = (current + 1) % 7;
      }
    } else {
      const idx = DAY_MAP[part];
      if (idx !== undefined) {
        days.add(idx);
      }
    }
  }

  return days.size > 0 ? days : new Set([1, 2, 3, 4, 5]);
}

function parseWorkingHours(): Array<{ startMinutes: number; endMinutes: number }> {
  const envValue = process.env.WORKING_HOURS || "09:00-17:00";
  const segments = envValue.split(/[,;]+/).map((segment) => segment.trim());

  const periods: Array<{ startMinutes: number; endMinutes: number }> = [];
  for (const segment of segments) {
    if (!segment) continue;
    const [start, end] = segment.split("-");
    if (!start || !end) continue;
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);
    if (startMinutes >= endMinutes) continue;
    periods.push({ startMinutes, endMinutes });
  }

  if (periods.length === 0) {
    periods.push({ startMinutes: 9 * 60, endMinutes: 17 * 60 });
  }

  return periods;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => parseInt(part, 10));
  return hours * 60 + (minutes || 0);
}

const scheduleConfig: WorkingScheduleConfig = {
  workingDays: parseWorkingDays(),
  slotMinutes: Math.max(5, parseInt(process.env.BOOKING_SLOT_MINUTES || "60", 10)),
  periods: parseWorkingHours(),
};

export function getScheduleConfig(): WorkingScheduleConfig {
  return scheduleConfig;
}

export function computeSlotsForDate(date: Date): string[] {
  const config = getScheduleConfig();
  if (!config.workingDays.has(date.getDay())) {
    return [];
  }

  const slots: string[] = [];

  for (const period of config.periods) {
    let cursor = period.startMinutes;
    while (cursor + config.slotMinutes <= period.endMinutes + 0.0001) {
      const hours = Math.floor(cursor / 60)
        .toString()
        .padStart(2, "0");
      const minutes = Math.floor(cursor % 60)
        .toString()
        .padStart(2, "0");
      slots.push(`${hours}:${minutes}`);
      cursor += config.slotMinutes;
    }
  }

  return slots;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
