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

/** Local dates touched by a half-open appointment interval. */
export function bookingAvailabilityDates(
  booking: { startsAt: Date; endsAt: Date },
  timezone: string,
): string[] {
  if (booking.endsAt <= booking.startsAt) return [];
  const first = formatInTimeZone(booking.startsAt, timezone, "yyyy-MM-dd");
  const last = formatInTimeZone(
    new Date(+booking.endsAt - 1),
    timezone,
    "yyyy-MM-dd",
  );
  const dates: string[] = [];
  for (
    let date = first;
    date <= last;
    date = addDays(new Date(`${date}T12:00Z`), 1)
      .toISOString()
      .slice(0, 10)
  )
    dates.push(date);
  return dates;
}

export function isBookingWithinAvailability(
  booking: { startsAt: Date; endsAt: Date },
  settings: BookingSettings,
  overrides:
    AvailabilityOverride | null | Map<string, AvailabilityOverride | null>,
): boolean {
  const dates = bookingAvailabilityDates(booking, settings.timezone);
  if (!dates.length) return false;
  return dates.every((date) => {
    const override =
      overrides instanceof Map
        ? (overrides.get(date) ?? null)
        : overrides?.date === date
          ? overrides
          : null;
    const nextDate = addDays(new Date(`${date}T12:00Z`), 1)
      .toISOString()
      .slice(0, 10);
    const portion = {
      startsAt: new Date(
        Math.max(
          +booking.startsAt,
          +fromZonedTime(`${date}T00:00`, settings.timezone),
        ),
      ),
      endsAt: new Date(
        Math.min(
          +booking.endsAt,
          +fromZonedTime(`${nextDate}T00:00`, settings.timezone),
        ),
      ),
    };
    return isBookingPortionWithinAvailability(
      portion,
      date,
      settings,
      override,
    );
  });
}

/** Whether an edit removes any previously open portion of this appointment. */
export function isBookingAffectedByOverride(
  booking: { startsAt: Date; endsAt: Date },
  settings: BookingSettings,
  previous: AvailabilityOverride | null,
  proposal: AvailabilityOverride,
): boolean {
  const date = proposal.date;
  const points = [booking.startsAt, booking.endsAt];
  for (const override of [previous, proposal]) {
    for (const range of resolveDayHours(date, settings, override))
      points.push(
        fromZonedTime(`${date}T${range.start}:00`, settings.timezone),
        fromZonedTime(`${date}T${range.end}:00`, settings.timezone),
      );
    const blocked = new Set(override?.blockedSlots ?? []);
    for (const slot of generateDaySlots(
      date,
      settings,
      override ? { ...override, blockedSlots: [] } : null,
    ))
      if (
        blocked.has(formatInTimeZone(slot.startsAt, settings.timezone, "HH:mm"))
      )
        points.push(slot.startsAt, slot.endsAt);
  }
  const ordered = [...new Set(points.map(Number))].sort((a, b) => a - b);
  return ordered.slice(0, -1).some((start, index) => {
    const portion = {
      startsAt: new Date(Math.max(start, +booking.startsAt)),
      endsAt: new Date(Math.min(ordered[index + 1], +booking.endsAt)),
    };
    return (
      portion.startsAt < portion.endsAt &&
      isBookingPortionWithinAvailability(portion, date, settings, previous) &&
      !isBookingPortionWithinAvailability(portion, date, settings, proposal)
    );
  });
}

function isBookingPortionWithinAvailability(
  booking: { startsAt: Date; endsAt: Date },
  date: string,
  settings: BookingSettings,
  override: AvailabilityOverride | null,
): boolean {
  const ranges = resolveDayHours(date, settings, override)
    .map((range) => ({
      startsAt: fromZonedTime(`${date}T${range.start}:00`, settings.timezone),
      endsAt: fromZonedTime(`${date}T${range.end}:00`, settings.timezone),
    }))
    .sort((a, b) => +a.startsAt - +b.startsAt);
  const blockedStarts = new Set(override?.blockedSlots ?? []);
  const blocked = generateDaySlots(
    date,
    settings,
    override ? { ...override, blockedSlots: [] } : null,
  ).filter((slot) =>
    blockedStarts.has(
      formatInTimeZone(slot.startsAt, settings.timezone, "HH:mm"),
    ),
  );
  if (blocked.some((range) => rangesOverlap(booking, range))) return false;
  let coveredUntil = booking.startsAt;
  for (const range of ranges) {
    if (range.startsAt > coveredUntil) break;
    if (range.endsAt > coveredUntil) coveredUntil = range.endsAt;
    if (coveredUntil >= booking.endsAt) return true;
  }
  return false;
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
