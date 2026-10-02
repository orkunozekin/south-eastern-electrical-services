import type { BookingSettings, WeeklyHours } from "./types";
import { isValidTime, isValidEmail } from "./validation";

export type SettingsInput = Pick<
  BookingSettings,
  | "timezone"
  | "slotDurationMinutes"
  | "notifyEmails"
  | "minNoticeMinutes"
  | "bookingWindowDays"
>;

export function validateWeeklyHours(hours: WeeklyHours): string | null {
  if (!hours || typeof hours !== "object" || Array.isArray(hours))
    return "Invalid weekly hours.";
  for (const [day, ranges] of Object.entries(hours)) {
    if (!/^[0-6]$/.test(day) || !Array.isArray(ranges))
      return "Invalid weekly hours.";
    const sorted = [...ranges].sort((a, b) =>
      String(a?.start).localeCompare(String(b?.start)),
    );
    for (let i = 0; i < sorted.length; i++) {
      const range = sorted[i];
      if (!range || !isValidTime(range.start) || !isValidTime(range.end))
        return "Weekly hours must use HH:mm times.";
      if (range.start >= range.end)
        return "Each day’s end time must be after start.";
      if (i > 0 && sorted[i - 1].end > range.start)
        return "Weekly hours must not overlap.";
    }
  }
  return null;
}

export function validateSettings(input: SettingsInput): string | null {
  if (!input || typeof input.timezone !== "string" || !input.timezone.trim())
    return "Timezone is required.";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone.trim() });
  } catch {
    return "Choose a valid business timezone.";
  }
  if (
    !Number.isInteger(input.slotDurationMinutes) ||
    input.slotDurationMinutes < 15 ||
    input.slotDurationMinutes > 120
  )
    return "Slot duration must be between 15 and 120 minutes.";
  if (
    !Number.isInteger(input.minNoticeMinutes) ||
    input.minNoticeMinutes < 0 ||
    input.minNoticeMinutes > 10080
  )
    return "Minimum notice must be between 0 and 10080 minutes.";
  if (
    !Number.isInteger(input.bookingWindowDays) ||
    input.bookingWindowDays < 1 ||
    input.bookingWindowDays > 90
  )
    return "Booking window must be between 1 and 90 days.";
  if (!Array.isArray(input.notifyEmails) || input.notifyEmails.length === 0)
    return "Add at least one email address to receive booking notifications.";
  if (
    input.notifyEmails.some(
      (e) => typeof e !== "string" || !isValidEmail(e.trim()),
    )
  )
    return "Enter valid notification email addresses.";
  return null;
}
