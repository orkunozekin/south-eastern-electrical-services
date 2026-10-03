import { describe, expect, it } from "vitest";
import { DEFAULT_BOOKING_SETTINGS } from "../lib/booking/defaults";
import {
  bookingCalendarWeeks,
  bookingLockDates,
  bookingAvailabilityDates,
  getAvailableSlots,
  getBookableDateStrings,
  isBookingWithinAvailability,
  isBookingAffectedByOverride,
} from "../lib/booking/slots";
import { mergeSettings } from "../lib/booking/repository";
import {
  validateSettings,
  validateWeeklyHours,
} from "../lib/booking/settings-validation";

const settings = {
  ...DEFAULT_BOOKING_SETTINGS,
  timezone: "UTC",
  weeklyHours: { 1: [{ start: "09:00", end: "12:00" }] },
};
const now = new Date("2026-10-05T08:00:00Z");
const range = (start: string, end: string) => ({
  startsAt: new Date(`2026-10-05T${start}:00Z`),
  endsAt: new Date(`2026-10-05T${end}:00Z`),
});
function available(duration: number, bookedRanges = [range("09:30", "10:00")]) {
  return getAvailableSlots({
    date: "2026-10-05",
    settings: { ...settings, slotDurationMinutes: duration },
    bookedRanges,
    now,
  }).map((s) => s.startsAt.toISOString().slice(11, 16));
}
describe("booking availability", () => {
  it("excludes overlap after a longer grid replaces shorter slots", () =>
    expect(available(60)).toEqual(["10:00", "11:00"]));
  it("excludes both halves after a shorter grid replaces longer slots", () =>
    expect(available(30, [range("09:00", "10:00")])).toEqual([
      "10:00",
      "10:30",
      "11:00",
      "11:30",
    ]));
  it("allows adjacent appointments", () =>
    expect(available(30, [range("09:00", "09:30")])).toContain("09:30"));
  it("uses instants after a timezone change and ignores legacy local IDs", () => {
    const changed = { ...settings, timezone: "America/Chicago" };
    const old = {
      startsAt: new Date("2026-10-05T14:00:00Z"),
      endsAt: new Date("2026-10-05T14:30:00Z"),
    };
    const result = getAvailableSlots({
      date: "2026-10-05",
      settings: changed,
      bookedRanges: [old],
      now,
    });
    expect(result.map((s) => s.slotId)).not.toContain("2026-10-05_0900");
    expect(result.map((s) => s.slotId)).toContain("2026-10-05_1000");
  });
  it("finds a booking starting the previous local day that crosses midnight", () => {
    const overnight = {
      ...settings,
      weeklyHours: { 1: [{ start: "00:00", end: "02:00" }] },
    };
    const result = getAvailableSlots({
      date: "2026-10-05",
      settings: overnight,
      now: new Date("2026-10-04T22:00:00Z"),
      bookedRanges: [
        {
          startsAt: new Date("2026-10-04T23:30:00Z"),
          endsAt: new Date("2026-10-05T00:30:00Z"),
        },
      ],
    });
    expect(result[0].startsAt.toISOString()).toBe("2026-10-05T00:30:00.000Z");
  });
  it("excludes slots exactly on or within the notice boundary", () => {
    const result = getAvailableSlots({
      date: "2026-10-05",
      settings: { ...settings, minNoticeMinutes: 60 },
      bookedRanges: [],
      now,
    });
    expect(result[0].startsAt.toISOString()).toBe("2026-10-05T09:30:00.000Z");
  });
  it("rejects out-of-window dates, even if weekly hours allow them", () =>
    expect(
      getAvailableSlots({
        date: "2026-10-12",
        settings: { ...settings, bookingWindowDays: 7 },
        bookedRanges: [],
        now,
      }),
    ).toEqual([]));
  it.each([1, 14, 90])(
    "counts %i calendar days including closed days",
    (days) => {
      const everyDay = {
        ...settings,
        bookingWindowDays: days,
        weeklyHours: Object.fromEntries(
          Array.from({ length: 7 }, (_, i) => [
            i,
            [{ start: "09:00", end: "10:00" }],
          ]),
        ),
      };
      const dates = getBookableDateStrings(everyDay, undefined, now);
      expect(dates).toHaveLength(days);
      expect(dates[0]).toBe("2026-10-05");
    },
  );
  it("enumerates calendar days without DST drift", () => {
    const everyDay = {
      ...settings,
      timezone: "America/Chicago",
      bookingWindowDays: 5,
      weeklyHours: Object.fromEntries(
        Array.from({ length: 7 }, (_, i) => [
          i,
          [{ start: "09:00", end: "10:00" }],
        ]),
      ),
    };
    expect(
      getBookableDateStrings(
        everyDay,
        undefined,
        new Date("2026-10-30T20:00:00Z"),
      ),
    ).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });
  it("includes weekends and uses the business day near midnight", () => {
    const everyDay = {
      ...settings,
      timezone: "America/Los_Angeles",
      bookingWindowDays: 1,
      weeklyHours: { 0: [{ start: "09:00", end: "10:00" }] },
    };
    expect(
      getBookableDateStrings(
        everyDay,
        undefined,
        new Date("2026-10-05T01:00:00Z"),
      ),
    ).toEqual(["2026-10-04"]);
  });
  it("splits long windows into Monday-based weeks including empty weeks", () => {
    const weeks = bookingCalendarWeeks(
      { timezone: "UTC", bookingWindowDays: 30 },
      now,
    );
    expect(weeks.flat()).toHaveLength(30);
    expect(weeks[1][0]).toBe("2026-10-12");
  });
  it("locks both UTC days when a slot crosses UTC midnight", () =>
    expect(
      bookingLockDates(
        new Date("2026-10-05T23:30Z"),
        new Date("2026-10-06T00:30Z"),
      ),
    ).toEqual(["2026-10-05", "2026-10-06"]));
});
describe("conflict warnings", () => {
  it("keeps a shorter booking contained in a longer slot", () =>
    expect(
      isBookingWithinAvailability(
        range("09:30", "10:00"),
        { ...settings, slotDurationMinutes: 60 },
        null,
      ),
    ).toBe(true));
  it("keeps a longer booking covered by adjacent shorter open slots", () =>
    expect(
      isBookingWithinAvailability(range("09:00", "10:00"), settings, null),
    ).toBe(true));
  it("rejects bookings outside hours or on closed days", () => {
    expect(
      isBookingWithinAvailability(range("08:30", "09:00"), settings, null),
    ).toBe(false);
    expect(
      isBookingWithinAvailability(range("09:00", "09:30"), settings, {
        date: "2026-10-05",
        closed: true,
      }),
    ).toBe(false);
  });
  it("rejects any overlap with a blocked slot", () =>
    expect(
      isBookingWithinAvailability(range("09:00", "10:00"), settings, {
        date: "2026-10-05",
        blockedSlots: ["09:30"],
      }),
    ).toBe(false));
  it("uses proposed timezone rather than original local labels", () =>
    expect(
      isBookingWithinAvailability(
        range("09:00", "09:30"),
        { ...settings, timezone: "America/New_York" },
        null,
      ),
    ).toBe(false));
});
describe("settings safety", () => {
  it("defaults missing legacy settings without changing the notice period", () => {
    expect(mergeSettings({ timezone: "UTC" })).toMatchObject({
      minNoticeMinutes: 0,
      bookingWindowDays: 14,
    });
    expect(
      mergeSettings({
        minNoticeMinutes: -1,
        bookingWindowDays: 91,
        slotDurationMinutes: 0,
      }),
    ).toMatchObject({
      minNoticeMinutes: 0,
      bookingWindowDays: 14,
      slotDurationMinutes: 30,
    });
  });
  const valid = { ...settings, notifyEmails: ["owner@example.com"] };
  it.each([0, 91, 1.5])("rejects invalid window %i", (value) =>
    expect(validateSettings({ ...valid, bookingWindowDays: value })).toMatch(
      /window/i,
    ),
  );
  it("rejects empty notification lists", () =>
    expect(validateSettings({ ...valid, notifyEmails: [] })).toMatch(
      /at least one/,
    ));
  it("rejects overlapping weekly hours", () =>
    expect(
      validateWeeklyHours({
        1: [
          { start: "09:00", end: "11:00" },
          { start: "10:00", end: "12:00" },
        ],
      }),
    ).toMatch(/overlap/));
});

it("keeps a booking in the open tail after changing to 45-minute slots", () => {
  expect(
    isBookingWithinAvailability(
      range("16:30", "17:00"),
      {
        ...settings,
        slotDurationMinutes: 45,
        weeklyHours: { 1: [{ start: "09:00", end: "17:00" }] },
      },
      null,
    ),
  ).toBe(true);
});

it("ignores obsolete blocks after a duration change while retaining active blocks", () => {
  const changed = { ...settings, slotDurationMinutes: 45 };
  expect(
    isBookingWithinAvailability(range("10:00", "10:30"), changed, {
      date: "2026-10-05",
      blockedSlots: ["09:30"],
    }),
  ).toBe(true);
  expect(
    isBookingWithinAvailability(range("10:00", "10:30"), changed, {
      date: "2026-10-05",
      blockedSlots: ["09:45"],
    }),
  ).toBe(false);
});

it("enumerates every business-local date of a legacy interval, excluding its exact end", () => {
  expect(
    bookingAvailabilityDates(
      {
        startsAt: new Date("2026-10-05T22:00Z"),
        endsAt: new Date("2026-10-07T00:00Z"),
      },
      "UTC",
    ),
  ).toEqual(["2026-10-05", "2026-10-06"]);
  expect(
    isBookingWithinAvailability(
      range("09:00", "09:30"),
      settings,
      new Map([["2026-10-05", { date: "2026-10-05", closed: true }]]),
    ),
  ).toBe(false);
});

it("detects closing a date for a booking in the open tail of a changed grid", () => {
  expect(
    isBookingAffectedByOverride(
      range("16:30", "17:00"),
      {
        ...settings,
        slotDurationMinutes: 45,
        weeklyHours: { 1: [{ start: "09:00", end: "17:00" }] },
      },
      null,
      { date: "2026-10-05", closed: true },
    ),
  ).toBe(true);
});
