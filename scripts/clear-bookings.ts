/**
 * Destructive developer reset. Preview first; requires --yes to delete.
 * node --env-file=.env.local --import tsx scripts/clear-bookings.ts [--yes] [--notify]
 * --notify opts into cancelling and emailing upcoming customers BEFORE deletion.
 * Stop booking traffic before a reset. Never run this against production test data.
 */
import { getAdminDb } from "../lib/firebase/admin";
import { listBookings } from "../lib/booking/repository";
import { assertResetNoticesResolved } from "../lib/booking/reset-notices";
import { cancelAndNotify } from "../lib/booking/cancellation";

async function main() {
  const args = new Set(process.argv.slice(2));
  if ([...args].some((arg) => !["--yes", "--notify"].includes(arg)))
    throw new Error("Allowed flags: --yes, --notify");
  const db = getAdminDb();
  const upcoming = await listBookings({
    from: new Date(),
    status: "confirmed",
  });
  console.log(
    `Project: ${process.env.FIREBASE_PROJECT_ID}. Upcoming confirmed bookings: ${upcoming.length}; with email: ${upcoming.filter((b) => b.email).length}.`,
  );
  if (!args.has("--yes")) {
    console.log(
      "Preview only. Pass --yes to delete all bookings, legacy slots, and booking day locks. Pass --notify too to email upcoming customers.",
    );
  } else {
    if (args.has("--notify")) {
      assertResetNoticesResolved(await listBookings({ status: "cancelled" }));
      for (const booking of upcoming) {
        const result = await cancelAndNotify(booking.id, {
          notifyCustomer: true,
        });
        console.log(
          `${booking.id}: ${result.notice}${result.noticeReason ? ` (${result.noticeReason})` : ""}`,
        );
        // Preserve audit records if delivery or metadata failed; do not hide failures.
        if (
          result.notice === "failed" ||
          result.notice === "pending" ||
          !result.recorded ||
          (booking.email && result.notice !== "sent")
        ) {
          throw new Error(
            "Reset stopped before deletion because a notice could not be confirmed. Review the cancelled booking before retrying.",
          );
        }
      }
    }
    for (const name of ["bookings", "slots", "bookingDays"]) {
      let deleted = 0;
      for (;;) {
        const snap = await db.collection(name).limit(400).get();
        if (snap.empty) break;
        const batch = db.batch();
        for (const doc of snap.docs) batch.delete(doc.ref);
        await batch.commit();
        deleted += snap.size;
      }
      console.log(`Deleted ${deleted} ${name} documents.`);
    }
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
