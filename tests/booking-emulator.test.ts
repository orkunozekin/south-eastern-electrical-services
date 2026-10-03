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
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { DEFAULT_BOOKING_SETTINGS } from "../lib/booking/defaults";
vi.mock("../lib/auth/session", () => ({
  getVerifiedAdmin: vi.fn(async () => ({ uid: "emulator-admin" })),
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
    it("only confirms one concurrent request for the same slot", async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () => repo.createBooking(input("09:00"))),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await repo.listBookings({ status: "confirmed" })).toHaveLength(1);
    }, 60000);
  },
);
