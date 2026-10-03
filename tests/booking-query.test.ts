import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BOOKING_SETTINGS } from "../lib/booking/defaults";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));
vi.mock("../lib/firebase/admin", () => ({
  getAdminDb: () => {
    const query = {
      where: (...args: unknown[]) => {
        mocks.where(...args);
        return query;
      },
      orderBy: (...args: unknown[]) => {
        mocks.orderBy(...args);
        return query;
      },
      get: async () => ({ docs: [] }),
    };
    return {
      collection: (name: string) => ({
        ...query,
        doc: () => ({ name, id: "test" }),
      }),
      runTransaction: async (
        callback: (tx: { get: typeof mocks.get }) => unknown,
      ) => callback({ get: mocks.get }),
    };
  },
}));
import { createBooking } from "../lib/booking/repository";
const settings = {
  ...DEFAULT_BOOKING_SETTINGS,
  timezone: "UTC",
  weeklyHours: { 1: [{ start: "09:00", end: "10:00" }] },
};
beforeEach(() => {
  mocks.get.mockReset();
  mocks.where.mockClear();
  mocks.orderBy.mockClear();
  mocks.get
    .mockResolvedValueOnce({ data: () => settings })
    .mockResolvedValueOnce({ data: () => undefined });
});
describe("booking query guards", () => {
  it("rejects past generated slots before reading locks or overlap candidates", async () => {
    await expect(
      createBooking({
        name: "Test",
        phone: "5551234567",
        startsAt: new Date("2020-01-06T09:00Z"),
      }),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(mocks.where).not.toHaveBeenCalled();
  });
});
