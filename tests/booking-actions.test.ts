import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isFirebaseAdminConfigured: vi.fn(() => true),
  getBookingSettings: vi.fn(),
  listAvailableSlots: vi.fn(),
}));

vi.mock("../lib/firebase/config", () => ({
  isFirebaseAdminConfigured: mocks.isFirebaseAdminConfigured,
}));
vi.mock("../lib/booking/server", () => ({
  ...mocks,
  BookingError: class extends Error {},
}));

import {
  fetchBookingCalendarAction,
  fetchSlotsAction,
  submitBookingAction,
} from "../app/actions/booking";

describe("booking infrastructure errors", () => {
  it.each([
    ["calendar", () => fetchBookingCalendarAction()],
    ["slots", () => fetchSlotsAction("2026-10-05")],
    [
      "submission",
      () =>
        submitBookingAction({
          name: "Test",
          phone: "5551234567",
          startsAt: "2026-10-05T09:00:00Z",
        }),
    ],
  ])(
    "logs missing configuration for %s without exposing it",
    async (_, action) => {
      mocks.isFirebaseAdminConfigured.mockReturnValueOnce(false);
      const log = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(action()).resolves.toEqual({
        ok: false,
        error: "Booking is temporarily unavailable. Please try again later.",
      });
      expect(log).toHaveBeenCalledWith(
        "[booking] Firebase Admin credentials are missing.",
      );
    },
  );
  it("logs Firebase failures on the server without exposing them to visitors", async () => {
    const failure = new Error("Firebase credential initialization failed");
    mocks.getBookingSettings.mockRejectedValueOnce(failure);
    mocks.listAvailableSlots.mockResolvedValueOnce([]);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(fetchSlotsAction("2026-10-05")).resolves.toEqual({
      ok: false,
      error: "Booking is temporarily unavailable. Please try again later.",
    });
    expect(log).toHaveBeenCalledWith("[booking]", failure);
  });
});
