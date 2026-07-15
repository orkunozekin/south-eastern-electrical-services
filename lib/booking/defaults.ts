import type { BookingSettings, DayOfWeek, TimeRange } from "./types";

const weekday = (start: string, end: string): TimeRange[] => [{ start, end }];

/** Default Mon–Fri 9:00–17:00 ET, 30-minute callback slots. */
export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  timezone: "America/New_York",
  slotDurationMinutes: 30,
  weeklyHours: {
    1: weekday("09:00", "17:00"),
    2: weekday("09:00", "17:00"),
    3: weekday("09:00", "17:00"),
    4: weekday("09:00", "17:00"),
    5: weekday("09:00", "17:00"),
  },
  notifyEmails: [],
};

export const COLLECTIONS = {
  settings: "settings",
  bookings: "bookings",
  availabilityOverrides: "availabilityOverrides",
  slots: "slots",
} as const;

export const SETTINGS_BOOKING_DOC = "booking";

export function isDayOfWeek(value: number): value is DayOfWeek {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}
