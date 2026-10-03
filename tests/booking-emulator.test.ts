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
  },
);
