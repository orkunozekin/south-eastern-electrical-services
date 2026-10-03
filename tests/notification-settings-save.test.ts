import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BOOKING_SETTINGS } from "../lib/booking/defaults";

const state = vi.hoisted(() => ({
  saved: {} as Record<string, unknown>,
  replaceRecipientsAfterRead: false,
  writes: vi.fn(),
}));
vi.mock("../lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({
        get: async () => {
          const snapshot = { ...state.saved };
          if (state.replaceRecipientsAfterRead) {
            state.saved.notifyEmails = ["new-owner@example.com"];
          }
          return { data: () => snapshot };
        },
        set: async (payload: Record<string, unknown>, options: unknown) => {
          state.writes(payload, options);
          Object.assign(state.saved, payload);
        },
      }),
    }),
  }),
}));
vi.mock("../lib/auth/session", () => ({
  requireAdmin: vi.fn(async () => ({ uid: "test-admin" })),
}));
vi.mock("../lib/firebase/config", () => ({
  isFirebaseAdminConfigured: () => true,
}));
vi.mock("../lib/booking/server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../lib/booking/server")>();
  return { ...original, findConflictingBookings: vi.fn(async () => []) };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  saveAdminSettingsAction,
  saveWeeklyHoursAction,
} from "../app/actions/admin";

beforeEach(() => {
  state.saved = {
    ...DEFAULT_BOOKING_SETTINGS,
    notifyEmails: ["owner@example.com"],
  };
  state.replaceRecipientsAfterRead = false;
  state.writes.mockClear();
});

describe("notification settings saves", () => {
  it("rejects an empty list without overwriting existing recipients", async () => {
    expect(
      await saveAdminSettingsAction({
        ...DEFAULT_BOOKING_SETTINGS,
        notifyEmails: [],
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("at least one"),
    });
    expect(state.writes).not.toHaveBeenCalled();
    expect(state.saved.notifyEmails).toEqual(["owner@example.com"]);
  });

  it("saves normalized recipients without changing weekly hours", async () => {
    expect(
      await saveAdminSettingsAction({
        ...DEFAULT_BOOKING_SETTINGS,
        notifyEmails: ["OWNER@example.com", "owner@example.com"],
      }),
    ).toEqual({ ok: true });
    expect(state.saved.notifyEmails).toEqual(["owner@example.com"]);
    expect(state.saved.weeklyHours).toEqual(
      DEFAULT_BOOKING_SETTINGS.weeklyHours,
    );
    expect(state.writes.mock.calls[0][0]).not.toHaveProperty("weeklyHours");
  });

  it("preserves a newer recipient list when weekly hours save from a stale snapshot", async () => {
    state.replaceRecipientsAfterRead = true;
    const weeklyHours = { 1: [{ start: "10:00", end: "12:00" }] };
    expect(await saveWeeklyHoursAction(weeklyHours)).toEqual({ ok: true });
    expect(state.saved.weeklyHours).toEqual(weeklyHours);
    expect(state.saved.notifyEmails).toEqual(["new-owner@example.com"]);
    expect(state.writes.mock.calls[0][0]).not.toHaveProperty("notifyEmails");
  });
});
