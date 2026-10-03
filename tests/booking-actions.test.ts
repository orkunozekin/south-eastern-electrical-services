import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBookingSettings: vi.fn(),
  listAvailableSlots: vi.fn(),
}));

vi.mock("../lib/firebase/config", () => ({
  isFirebaseAdminConfigured: () => true,
}));
vi.mock("../lib/booking/server", () => ({
  ...mocks,
  BookingError: class extends Error {},
}));

import { fetchSlotsAction } from "../app/actions/booking";

describe("booking infrastructure errors", () => {
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
