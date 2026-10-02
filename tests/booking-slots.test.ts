import { describe, expect, it } from "vitest";
import { DEFAULT_BOOKING_SETTINGS } from "../lib/booking/defaults";
import { getAvailableSlots } from "../lib/booking/slots";
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
});
