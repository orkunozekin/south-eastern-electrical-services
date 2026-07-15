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
 * Available slots for a day: weekly hours + overrides − taken slot ids.
 * Past slots (relative to `now`) are excluded.
 */
export function getAvailableSlots(options: {
  date: string;
  settings: BookingSettings;
  override?: AvailabilityOverride | null;
  takenSlotIds: Iterable<string>;
  now?: Date;
}): Slot[] {
  const {
    date,
    settings,
    override = null,
    takenSlotIds,
    now = new Date(),
  } = options;
  const taken = new Set(takenSlotIds);

  return generateDaySlots(date, settings, override).filter((slot) => {
    if (taken.has(slot.slotId)) return false;
    if (slot.startsAt <= now) return false;
    return true;
  });
}

/**
 * Upcoming calendar dates (YYYY-MM-DD in business timezone) that have
 * default weekly hours. Overrides can still close a day when slots load.
 */
export function getBookableDateStrings(
  settings: BookingSettings,
  daysAhead = 14,
  now = new Date(),
): string[] {
  const dates: string[] = [];
  const today = formatInTimeZone(now, settings.timezone, "yyyy-MM-dd");
  const startNoon = fromZonedTime(`${today}T12:00:00`, settings.timezone);

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const probe = addDays(startNoon, offset);
    const date = formatInTimeZone(probe, settings.timezone, "yyyy-MM-dd");
    const day = getDay(toZonedTime(probe, settings.timezone));
    if (!isDayOfWeek(day)) continue;
    const hours = settings.weeklyHours[day];
    if (hours && hours.length > 0) {
      dates.push(date);
    }
  }

  return dates;
}
