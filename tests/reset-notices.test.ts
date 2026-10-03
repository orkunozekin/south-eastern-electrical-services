import { describe, expect, it } from "vitest";
import { assertResetNoticesResolved } from "../lib/booking/reset-notices";
import type { Booking } from "../lib/booking/types";
const booking: Booking = {
  id: "prior-attempt",
  name: "Jane",
  phone: "5551234567",
  email: "jane@example.com",
  startsAt: new Date(0),
  endsAt: new Date(1800000),
  createdAt: new Date(0),
  status: "cancelled",
  slotId: "test",
};
describe("reset retry notice audit", () => {
  it.each([undefined, "failed", "skipped"] as const)(
    "preserves an old cancelled booking with notice %s",
    (cancelNotice) => {
      expect(() =>
        assertResetNoticesResolved([{ ...booking, cancelNotice }]),
      ).toThrow("prior-attempt");
    },
  );
  it("allows confirmed delivery and a recorded no-email skip", () => {
    expect(() =>
      assertResetNoticesResolved([
        { ...booking, cancelNotice: "sent" },
        { ...booking, email: undefined, cancelNotice: "skipped" },
      ]),
    ).not.toThrow();
  });
});
