import { bookingCalendarWeeks } from "./slots";

/** Select the first offered date and display the week containing it. */
export function firstCalendarSelection(
  calendar: {
    dates: string[];
    timezone: string;
    bookingWindowDays: number;
    weeks?: string[][];
  },
  now = new Date(),
): { selectedDate: string | null; weekIndex: number } {
  const selectedDate = calendar.dates[0] ?? null;
  const weeks = calendar.weeks ?? bookingCalendarWeeks(calendar, now);
  const weekIndex = selectedDate
    ? weeks.findIndex((week) => week.includes(selectedDate))
    : 0;
  return { selectedDate, weekIndex: Math.max(0, weekIndex) };
}
