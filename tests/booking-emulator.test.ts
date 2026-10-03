/** Explicit opt-in. This suite never connects to a real Firebase project. */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import { DEFAULT_BOOKING_SETTINGS } from "../lib/booking/defaults";
vi.mock("../lib/auth/session", () => ({
  requireAdmin: vi.fn(async () => ({ uid: "emulator-admin" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/plunk", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/plunk")>();
  return {
    ...original,
    isPlunkConfigured: () => true,
    cancellationRescheduleUrl: () => "https://example.com/book?ref=cancelled",
    sendCustomerCancellation: vi.fn(async () => "sent" as const),
  };
});
import type * as AdminActions from "../app/actions/admin";
import { requireAdmin } from "../lib/auth/session";
import type * as Repository from "../lib/booking/repository";

const enabled = process.env.RUN_FIRESTORE_TESTS === "true";
const emulator = process.env.FIRESTORE_EMULATOR_HOST;
if (
  enabled &&
  (!emulator ||
    !/^127\.0\.0\.1:\d+$/.test(emulator) ||
    process.env.FIREBASE_PROJECT_ID !== "demo-southeastern-tests")
) {
  throw new Error(
    "Emulator tests require RUN_FIRESTORE_TESTS=true, a loopback FIRESTORE_EMULATOR_HOST, and FIREBASE_PROJECT_ID=demo-southeastern-tests.",
  );
}
let app: App;
let db: Firestore;
let repo: typeof Repository;
let actions: typeof AdminActions;
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const startsAt = (hm: string) => new Date(`${tomorrow}T${hm}:00Z`);
const settings = {
  ...DEFAULT_BOOKING_SETTINGS,
  timezone: "UTC",
  bookingWindowDays: 90,
  weeklyHours: Object.fromEntries(
    Array.from({ length: 7 }, (_, day) => [
      day,
      [{ start: "09:00", end: "12:00" }],
    ]),
  ),
  notifyEmails: ["owner@example.com"],
};
const input = (hm: string) => ({
  name: "Emulator customer",
  phone: "5551234567",
  startsAt: startsAt(hm),
});

describe.skipIf(!enabled)(
  "real Firestore transactions in the local emulator",
  () => {
    beforeAll(async () => {
      app = initializeApp({ projectId: "demo-southeastern-tests" });
      db = getFirestore(app);
      repo = await import("../lib/booking/repository");
      actions = await import("../app/actions/admin");
    });
    beforeEach(async () => {
      vi.restoreAllMocks();
      for (const collection of [
        "bookings",
        "slots",
        "bookingDays",
        "settings",
        "availabilityOverrides",
      ]) {
        const snap = await db.collection(collection).get();
        const batch = db.batch();
        for (const doc of snap.docs) batch.delete(doc.ref);
        await batch.commit();
      }
      await repo.saveBookingSettings(settings);
    });
    afterAll(async () => {
      await db.terminate();
      await deleteApp(app);
    });
    it("blocks legacy long bookings starting before the day and allows adjacent slots", async () => {
      await db
        .collection("bookings")
        .doc("legacy-long")
        .set({
          name: "Legacy customer",
          phone: "5551234567",
          startsAt: Timestamp.fromDate(
            new Date(+startsAt("09:00") - 24 * 3600000),
          ),
          endsAt: Timestamp.fromDate(startsAt("10:00")),
          createdAt: Timestamp.now(),
          status: "confirmed",
          slotId: "legacy",
        });
      expect(
        (await repo.listAvailableSlots(tomorrow)).map((s) =>
          s.startsAt.toISOString(),
        ),
      ).not.toContain(startsAt("09:00").toISOString());
      await expect(repo.createBooking(input("09:00"))).rejects.toMatchObject({
        code: "SLOT_UNAVAILABLE",
      });
      await expect(repo.createBooking(input("10:00"))).resolves.toMatchObject({
        status: "confirmed",
      });
      await db
        .collection("bookings")
        .doc("legacy-long")
        .update({ status: "cancelled" });
      await expect(repo.createBooking(input("09:00"))).resolves.toMatchObject({
        status: "confirmed",
      });
    });
    it("filters cancelled and later bookings before decoding overlap candidates", async () => {
      // Deliberately omit other booking fields: these unrelated records must
      // be excluded by Firestore, before bookingFromDoc attempts to decode them.
      await db
        .collection("bookings")
        .doc("cancelled")
        .set({
          startsAt: Timestamp.fromDate(startsAt("09:00")),
          endsAt: Timestamp.fromDate(startsAt("10:00")),
          status: "cancelled",
        });
      await db
        .collection("bookings")
        .doc("later")
        .set({
          startsAt: Timestamp.fromDate(new Date(+startsAt("09:00") + 86400000)),
          endsAt: Timestamp.fromDate(new Date(+startsAt("10:00") + 86400000)),
          status: "confirmed",
        });
      expect(await repo.listAvailableSlots(tomorrow)).not.toHaveLength(0);
      await expect(repo.createBooking(input("09:00"))).resolves.toMatchObject({
        status: "confirmed",
      });
    });
    it("only confirms one concurrent request for the same slot", async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () => repo.createBooking(input("09:00"))),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await repo.listBookings({ status: "confirmed" })).toHaveLength(1);
    }, 60000);
    it("only confirms one of concurrent overlapping requests with different slot IDs", async () => {
      const weeklyHours = Object.fromEntries(
        Array.from({ length: 7 }, (_, day) => [
          day,
          [
            { start: "09:00", end: "10:00" },
            { start: "09:30", end: "10:30" },
          ],
        ]),
      );
      await repo.saveBookingSettings({
        ...settings,
        slotDurationMinutes: 60,
        weeklyHours,
      });
      const results = await Promise.allSettled([
        repo.createBooking(input("09:00")),
        repo.createBooking(input("09:30")),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    }, 60000);
    it("reproduces the old bug when locking only individual local slot IDs", async () => {
      // Control: the old transaction checked only slots/{local-start}, so
      // different IDs never contended even when their time ranges overlapped.
      async function legacyBooking(hm: string) {
        const ref = db.collection("bookings").doc();
        const slotRef = db
          .collection("slots")
          .doc(`${tomorrow}_${hm.replace(":", "")}`);
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(slotRef);
          if (snap.data()?.booked) throw new Error("Taken");
          tx.set(slotRef, { booked: true, bookingId: ref.id });
          tx.set(ref, {
            startsAt: startsAt(hm),
            endsAt: new Date(+startsAt(hm) + 60 * 60000),
            status: "confirmed",
          });
        });
      }
      const results = await Promise.allSettled([
        legacyBooking("09:00"),
        legacyBooking("09:30"),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    }, 60000);
    it("excludes overlaps after changing slot length and permits adjacent bookings", async () => {
      await repo.createBooking(input("09:30"));
      await repo.saveBookingSettings({ ...settings, slotDurationMinutes: 60 });
      expect(
        (await repo.listAvailableSlots(tomorrow)).map((s) =>
          s.startsAt.toISOString(),
        ),
      ).not.toContain(startsAt("09:00").toISOString());
      await expect(repo.createBooking(input("09:00"))).rejects.toMatchObject({
        code: "SLOT_UNAVAILABLE",
      });
      await expect(repo.createBooking(input("10:00"))).resolves.toMatchObject({
        status: "confirmed",
      });
    });
    it("ignores stale slot documents and preserves invitation identity before sending", async () => {
      await db
        .collection("slots")
        .doc(`${tomorrow}_0900`)
        .set({ booked: true });
      const booking = await repo.createBooking({
        ...input("09:00"),
        email: "jane@example.com",
        timezone: "America/Chicago",
      });
      const stored = (
        await db.collection("bookings").doc(booking.id).get()
      ).data();
      expect(stored?.inviteUid).toBeTruthy();
      expect(stored?.customerTimezone).toBe("America/Chicago");
      const noEmail = await repo.createBooking(input("10:00"));
      expect(noEmail.inviteUid).toBeUndefined();
      expect((await repo.cancelBooking(booking.id)).changed).toBe(true);
      expect((await repo.cancelBooking(booking.id)).changed).toBe(false);
      await expect(repo.createBooking(input("09:00"))).resolves.toMatchObject({
        status: "confirmed",
      });
    });
    it("rejects forged timestamps, notice violations and dates outside the window", async () => {
      await expect(
        repo.createBooking({
          ...input("09:00"),
          startsAt: new Date(+startsAt("09:00") + 1000),
        }),
      ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
      await repo.saveBookingSettings({ ...settings, bookingWindowDays: 1 });
      expect(await repo.listAvailableSlots(tomorrow)).toEqual([]);
      await expect(repo.createBooking(input("09:00"))).rejects.toMatchObject({
        code: "SLOT_UNAVAILABLE",
      });
      await repo.saveBookingSettings({ ...settings, minNoticeMinutes: 10080 });
      await expect(repo.createBooking(input("09:00"))).rejects.toMatchObject({
        code: "SLOT_UNAVAILABLE",
      });
    });
    it("uses proposed overrides in conflict previews and includes bookings added before save", async () => {
      await repo.createBooking(input("09:00"));
      const override = { date: tomorrow, closed: true };
      expect(
        await repo.findConflictingBookings({
          settings,
          overrides: new Map([[tomorrow, override]]),
        }),
      ).toHaveLength(1);
      await repo.createBooking(input("10:00"));
      await repo.saveAvailabilityOverride(override);
      expect(
        await repo.findConflictingBookings({
          settings,
          overrides: new Map([[tomorrow, override]]),
        }),
      ).toHaveLength(2);
      expect(await repo.listAvailableSlots(tomorrow)).toEqual([]);
    });
    it("does not cancel an unrelated conflict when adding a block", async () => {
      const oldConflict = await repo.createBooking(input("09:00"));
      const affected = await repo.createBooking(input("10:00"));
      await repo.saveBookingSettings({
        ...settings,
        weeklyHours: Object.fromEntries(
          Array.from({ length: 7 }, (_, day) => [
            day,
            [{ start: "10:00", end: "12:00" }],
          ]),
        ),
      });
      const proposal = {
        date: tomorrow,
        closed: false,
        blockedSlots: ["10:00"],
      };
      const preview = await actions.previewOverrideAction(proposal);
      if (!preview.ok) throw new Error(preview.error);
      expect(preview.conflicts.map((b) => b.id)).toEqual([affected.id]);
      const result = await actions.saveOverrideAction({
        ...proposal,
        conflictResolution: "cancel",
      });
      if (!result.ok) throw new Error(result.error);
      expect(result.results.map((b) => b.id)).toEqual([affected.id]);
      expect((await repo.getBooking(oldConflict.id))?.status).toBe("confirmed");
    });
    it.each(["weekly", "settings"])(
      "serializes concurrent bookings with %s saves",
      async (kind) => {
        const weeklyHours = Object.fromEntries(
          Array.from({ length: 7 }, (_, day) => [
            day,
            [{ start: "10:00", end: "12:00" }],
          ]),
        );
        const [booking, saved] = await Promise.allSettled([
          repo.createBooking(input("09:00")),
          kind === "weekly"
            ? actions.saveWeeklyHoursAction(weeklyHours)
            : actions.saveAdminSettingsAction({
                ...settings,
                timezone: "America/New_York",
              }),
        ]);
        expect(saved.status).toBe("fulfilled");
        if (saved.status !== "fulfilled") throw saved.reason;
        if (booking.status === "fulfilled") {
          expect(saved.value).toMatchObject({
            ok: false,
            conflicts: [expect.objectContaining({ id: booking.value.id })],
          });
          expect((await repo.getBookingSettings()).timezone).toBe(
            settings.timezone,
          );
          expect((await repo.getBookingSettings()).weeklyHours).toEqual(
            settings.weeklyHours,
          );
        } else {
          expect(saved.value).toMatchObject({ ok: true });
          expect(booking.reason).toMatchObject({ code: "SLOT_UNAVAILABLE" });
        }
      },
    );
    it.each(["replaced", "deleted"])(
      "rejects cancellation for an override that was %s",
      async (change) => {
        const booking = await repo.createBooking(input("09:00"));
        const version = await repo.saveAvailabilityOverride({
          date: tomorrow,
          closed: true,
        });
        if (change === "replaced")
          await repo.saveAvailabilityOverride({
            date: tomorrow,
            closed: false,
          });
        else await repo.deleteAvailabilityOverride(tomorrow);
        await expect(
          repo.cancelBooking(booking.id, { date: tomorrow, version }),
        ).rejects.toMatchObject({ code: "VALIDATION" });
        expect((await repo.getBooking(booking.id))?.status).toBe("confirmed");
      },
    );
    it("allows cancellation while the saved override version still matches", async () => {
      const booking = await repo.createBooking(input("09:00"));
      const version = await repo.saveAvailabilityOverride({
        date: tomorrow,
        closed: true,
      });
      expect(
        await repo.cancelBooking(booking.id, { date: tomorrow, version }),
      ).toMatchObject({ changed: true });
    });
    it("ignores unvalidated extra override fields and preserves saved hours", async () => {
      const hours = [{ start: "09:00", end: "12:00" }];
      await repo.saveAvailabilityOverride({ date: tomorrow, hours });
      const result = await actions.saveOverrideAction({
        date: tomorrow,
        closed: false,
        blockedSlots: [],
        conflictResolution: "keep",
        hours: [{ start: "bogus", end: "broken" }],
      } as Parameters<typeof actions.saveOverrideAction>[0]);
      expect(result.ok).toBe(true);
      expect((await repo.getAvailabilityOverride(tomorrow))?.hours).toEqual(
        hours,
      );
      expect((await repo.listAvailableSlots(tomorrow)).length).toBeGreaterThan(
        0,
      );
    });
    it("includes legacy appointments starting before a closed or blocked date", async () => {
      const nextDate = new Date(+startsAt("09:00") + 86400000)
        .toISOString()
        .slice(0, 10);
      const booking = await repo.createBooking(input("09:00"));
      await db
        .collection("bookings")
        .doc(booking.id)
        .update({ endsAt: Timestamp.fromDate(new Date(`${nextDate}T10:00Z`)) });
      const preview = await actions.previewOverrideAction({
        date: nextDate,
        closed: false,
        blockedSlots: ["09:00"],
      });
      if (!preview.ok) throw new Error(preview.error);
      expect(preview.conflicts.map((b) => b.id)).toEqual([booking.id]);
      const result = await actions.saveOverrideAction({
        date: nextDate,
        closed: true,
        blockedSlots: [],
        conflictResolution: "cancel",
      });
      if (!result.ok) throw new Error(result.error);
      expect(result.results.map((b) => b.id)).toEqual([booking.id]);
      expect((await repo.getBooking(booking.id))?.status).toBe("cancelled");
    });
    it.each(["missing", "existing"])(
      "rejects a stale %s override baseline without cancelling",
      async (kind) => {
        const booking = await repo.createBooking(input("09:00"));
        if (kind === "existing")
          await repo.saveAvailabilityOverride({
            date: tomorrow,
            closed: false,
          });
        const snapshot = await repo.getAvailabilityOverrideSnapshot(tomorrow);
        await repo.saveAvailabilityOverride({ date: tomorrow, closed: true });
        await expect(
          repo.saveAvailabilityOverride(
            { date: tomorrow, closed: true },
            { version: snapshot.version },
          ),
        ).rejects.toMatchObject({ code: "VALIDATION" });
        expect((await repo.getBooking(booking.id))?.status).toBe("confirmed");
      },
    );
    it("conditionally saves an unchanged override and returns the cancellation guard version", async () => {
      await repo.saveAvailabilityOverride({ date: tomorrow, closed: false });
      const snapshot = await repo.getAvailabilityOverrideSnapshot(tomorrow);
      const version = await repo.saveAvailabilityOverride(
        { date: tomorrow, closed: true },
        { version: snapshot.version },
      );
      expect(
        (await repo.getAvailabilityOverrideSnapshot(tomorrow)).version?.isEqual(
          version,
        ),
      ).toBe(true);
    });
    it("guards every admin preview and mutation and rejects invalid blocked starts", async () => {
      const result = await actions.previewOverrideAction({
        date: tomorrow,
        closed: false,
        blockedSlots: ["09:15"],
      });
      expect(requireAdmin).toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: false,
        error: expect.stringContaining("isn't a slot start"),
      });
    });
    it("cancels and reports customer notices for all date-override conflicts", async () => {
      await repo.createBooking({
        ...input("09:00"),
        email: "jane@example.com",
      });
      await repo.createBooking(input("10:00"));
      const preview = await actions.previewOverrideAction({
        date: tomorrow,
        closed: true,
        blockedSlots: [],
      });
      expect(preview).toMatchObject({ ok: true, conflicts: expect.any(Array) });
      if (!preview.ok) throw new Error(preview.error);
      expect(preview.conflicts).toHaveLength(2);
      await repo.createBooking(input("11:00"));
      const result = await actions.saveOverrideAction({
        date: tomorrow,
        closed: true,
        blockedSlots: [],
        conflictResolution: "cancel-and-notify",
      });
      if (!result.ok) throw new Error(result.error);
      expect(result.results).toHaveLength(3);
      expect(
        result.results.filter((r) => r.ok && r.result.notice === "sent"),
      ).toHaveLength(1);
      expect(
        result.results.filter((r) => r.ok && r.result.notice === "skipped"),
      ).toHaveLength(2);
      expect(await repo.listBookings({ status: "confirmed" })).toHaveLength(0);
    });
    it("keeps conflicts when requested and shows the outside-hours badge", async () => {
      await repo.createBooking(input("09:00"));
      const result = await actions.saveOverrideAction({
        date: tomorrow,
        closed: true,
        blockedSlots: [],
        conflictResolution: "keep",
      });
      if (!result.ok) throw new Error(result.error);
      expect(result.keptConflicts).toHaveLength(1);
      expect(await actions.getAdminBookingsAction()).toMatchObject({
        ok: true,
        bookings: [
          expect.objectContaining({ outsideHours: true, status: "confirmed" }),
        ],
      });
    });
    it("requires weekly-hours confirmation and preserves saved notification recipients", async () => {
      await repo.createBooking(input("09:00"));
      const result = await actions.saveWeeklyHoursAction({});
      expect(result).toMatchObject({ ok: false, conflicts: expect.any(Array) });
      expect(
        await actions.saveWeeklyHoursAction({}, { keepConflicts: true }),
      ).toEqual({ ok: true });
      expect((await repo.getBookingSettings()).notifyEmails).toEqual([
        "owner@example.com",
      ]);
    });
    it("settings changes preview conflicts and shrinking a window keeps existing bookings", async () => {
      const booking = await repo.createBooking(input("09:00"));
      const changed = {
        ...settings,
        timezone: "America/New_York",
        bookingWindowDays: 1,
      };
      expect(await actions.previewSettingsAction(changed)).toMatchObject({
        ok: true,
        conflicts: [expect.objectContaining({ id: booking.id })],
      });
      expect(await actions.saveAdminSettingsAction(changed)).toMatchObject({
        ok: false,
      });
      expect(
        await actions.saveAdminSettingsAction(changed, { keepConflicts: true }),
      ).toEqual({ ok: true });
      expect((await repo.getBooking(booking.id))?.status).toBe("confirmed");
      expect(await repo.listAvailableSlots(tomorrow)).toEqual([]);
      expect(
        await actions.cancelBookingAction(booking.id, {
          notifyCustomer: false,
        }),
      ).toMatchObject({ ok: true, notice: "skipped" });
    });
  },
);
