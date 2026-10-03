import { describe, expect, it } from "vitest";
import { bookingCalendarWeeks } from "../lib/booking/slots";
import { firstCalendarSelection } from "../lib/booking/calendar-selection";
const now = new Date("2026-10-05T08:00Z");
const calendar = { timezone: "UTC", bookingWindowDays: 30 };
describe("loaded calendar selection", () => {
  it("displays the later week containing the first offered date", () => {
    expect(
      firstCalendarSelection(
        { ...calendar, dates: ["2026-10-19", "2026-10-20"] },
        now,
      ),
    ).toEqual({ selectedDate: "2026-10-19", weekIndex: 2 });
  });
  it("keeps week zero when its first date is offered", () => {
    expect(
      firstCalendarSelection({ ...calendar, dates: ["2026-10-06"] }, now),
    ).toEqual({ selectedDate: "2026-10-06", weekIndex: 0 });
  });
  it("clears selection when no dates are offered", () => {
    expect(firstCalendarSelection({ ...calendar, dates: [] }, now)).toEqual({
      selectedDate: null,
      weekIndex: 0,
    });
  });
});

it("preserves the server's first week after client midnight", () => {
  const weeks = bookingCalendarWeeks(calendar, new Date("2026-10-05T23:59Z"));
  const loaded = { ...calendar, dates: ["2026-10-05"], weeks };
  expect(firstCalendarSelection(loaded, new Date("2026-10-06T00:01Z"))).toEqual(
    { selectedDate: "2026-10-05", weekIndex: 0 },
  );
  expect(loaded.weeks[0]).toContain("2026-10-05");
});
