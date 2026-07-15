import { DEFAULT_BOOKING_SETTINGS } from "./defaults";
import type { DayOfWeek, TimeRange, WeeklyHours } from "./types";

export type DayHoursDraft = {
  day: DayOfWeek;
  enabled: boolean;
  start: string;
  end: string;
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export function dayLabel(day: DayOfWeek): string {
  return DAY_LABELS[day];
}

export function weeklyHoursToDraft(hours: WeeklyHours): DayHoursDraft[] {
  const defaults = DEFAULT_BOOKING_SETTINGS.weeklyHours;
  return ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => {
    const range: TimeRange | undefined = hours[day]?.[0] ?? defaults[day]?.[0];
    return {
      day,
      enabled: Boolean(hours[day]?.length),
      start: range?.start ?? "09:00",
      end: range?.end ?? "17:00",
    };
  });
}

export function draftToWeeklyHours(draft: DayHoursDraft[]): WeeklyHours {
  const weeklyHours: WeeklyHours = {};
  for (const row of draft) {
    if (!row.enabled) continue;
    weeklyHours[row.day] = [{ start: row.start, end: row.end }];
  }
  return weeklyHours;
}
