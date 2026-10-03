import { addDays, addMinutes, getDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { isDayOfWeek } from "./defaults";
import type {
  AvailabilityOverride,
  BookingSettings,
  Slot,
  TimeRange,
} from "./types";
import { isValidDateString, isValidTime } from "./validation";

function parseHm(hm: string): { hours: number; minutes: number } {
  const [hours, minutes] = hm.split(":").map(Number);
  return { hours: hours!, minutes: minutes! };
}

function hmToMinutes(hm: string): number {
  const { hours, minutes } = parseHm(hm);
  return hours * 60 + minutes;
}

function minutesToHm(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function slotIdForStart(startsAt: Date, timezone: string): string {
  return formatInTimeZone(startsAt, timezone, "yyyy-MM-dd_HHmm");
}

function resolveDayHours(
  date: string,
  settings: BookingSettings,
  override: AvailabilityOverride | null,
): TimeRange[] {
  if (override?.closed) return [];
  if (override?.hours && override.hours.length > 0) return override.hours;

  const localNoon = fromZonedTime(`${date}T12:00:00`, settings.timezone);
  const day = getDay(toZonedTime(localNoon, settings.timezone));
  if (!isDayOfWeek(day)) return [];
  return settings.weeklyHours[day] ?? [];
}

/**
 * All candidate slots for a calendar day (before subtracting bookings / blocks).
 */
export function generateDaySlots(
  date: string,
  settings: BookingSettings,
  override: AvailabilityOverride | null = null,
): Slot[] {
  if (!isValidDateString(date)) {
    throw new Error(`Invalid date: ${date}`);
  }

  const ranges = resolveDayHours(date, settings, override);
  const blocked = new Set(override?.blockedSlots ?? []);
  const duration = settings.slotDurationMinutes;
  const slots: Slot[] = [];

  for (const range of ranges) {
    if (!isValidTime(range.start) || !isValidTime(range.end)) {
      throw new Error(`Invalid time range: ${range.start}–${range.end}`);
    }

    let cursor = hmToMinutes(range.start);
    const end = hmToMinutes(range.end);

    while (cursor + duration <= end) {
      const startHm = minutesToHm(cursor);
      if (!blocked.has(startHm)) {
        const startsAt = fromZonedTime(
          `${date}T${startHm}:00`,
          settings.timezone,
        );
        const endsAt = addMinutes(startsAt, duration);
        slots.push({
          slotId: slotIdForStart(startsAt, settings.timezone),
          startsAt,
          endsAt,
        });
      }
      cursor += duration;
    }
  }

  return slots;
}

/**
 * Available slots for a day: weekly hours + overrides minus overlapping bookings.
 * Past slots (relative to `now`) are excluded.
 */
export function getAvailableSlots(options: {
  date: string;
  settings: BookingSettings;
  override?: AvailabilityOverride | null;
  bookedRanges: Iterable<{ startsAt: Date; endsAt: Date }>;
  now?: Date;
}): Slot[] {
  const {
    date,
    settings,
    override = null,
    bookedRanges,
    now = new Date(),
  } = options;
  const booked = [...bookedRanges];
  if (!isDateWithinBookingWindow(date, settings, now)) return [];
  const earliest = addMinutes(now, settings.minNoticeMinutes);

  return generateDaySlots(date, settings, override).filter((slot) => {
    if (booked.some((booking) => rangesOverlap(slot, booking))) return false;
    if (slot.startsAt <= earliest) return false;
    return true;
  });
}

/**
 * Upcoming calendar dates (YYYY-MM-DD in business timezone) that have
 * default weekly hours. Overrides can still close a day when slots load.
 */
export function getBookableDateStrings(
  settings: BookingSettings,
  daysAhead = settings.bookingWindowDays,
  now = new Date(),
): string[] {
  const dates: string[] = [];
  const today = formatInTimeZone(now, settings.timezone, "yyyy-MM-dd");
  const startNoon = new Date(`${today}T12:00:00Z`);

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const probe = addDays(startNoon, offset);
    const date = probe.toISOString().slice(0, 10);
    const day = probe.getUTCDay();
    if (!isDayOfWeek(day)) continue;
    const hours = settings.weeklyHours[day];
    if (hours && hours.length > 0) {
      dates.push(date);
    }
  }

  return dates;
}

export const MAX_SLOT_MINUTES = 120;

export function rangesOverlap(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function bookingWindowEnd(
  settings: BookingSettings,
  now = new Date(),
): string {
  const today = formatInTimeZone(now, settings.timezone, "yyyy-MM-dd");
  return addDays(new Date(`${today}T12:00:00Z`), settings.bookingWindowDays - 1)
    .toISOString()
    .slice(0, 10);
}

export function isDateWithinBookingWindow(
  date: string,
  settings: BookingSettings,
  now = new Date(),
): boolean {
  return (
    date >= formatInTimeZone(now, settings.timezone, "yyyy-MM-dd") &&
    date <= bookingWindowEnd(settings, now)
  );
}

/** UTC day locks also serialize overlaps across a business timezone change. */
export function bookingLockDates(startsAt: Date, endsAt: Date): string[] {
  return [
    ...new Set([
      startsAt.toISOString().slice(0, 10),
      new Date(+endsAt - 1).toISOString().slice(0, 10),
    ]),
  ].sort();
}

/** Calendar weeks include closed days so navigation covers the full window. */
export function bookingCalendarWeeks(
  settings: Pick<BookingSettings, "timezone" | "bookingWindowDays">,
  now = new Date(),
): string[][] {
  const today = formatInTimeZone(now, settings.timezone, "yyyy-MM-dd");
  const start = new Date(`${today}T12:00:00Z`);
  const weeks: string[][] = [];
  for (let i = 0; i < settings.bookingWindowDays; i++) {
    const day = addDays(start, i);
    if (i === 0 || day.getUTCDay() === 1) weeks.push([]);
    weeks[weeks.length - 1].push(day.toISOString().slice(0, 10));
  }
  return weeks;
}
