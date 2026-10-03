/**
 * Legacy calendar identity backfill. Preview only without --yes.
 * MUST run before changing PLUNK_FROM_EMAIL's domain. Supply the exact sender
 * used for the original invites; the app cannot discover it from old records.
 * node --env-file=.env.local --import tsx scripts/backfill-invite-uids.ts --original-sender=hello@example.com [--yes]
 */
import { getAdminDb } from "../lib/firebase/admin";
import { listBookings } from "../lib/booking/repository";
import { inviteIdentity } from "../lib/booking/invite-identity";
import { isValidEmail } from "../lib/booking/validation";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== "--yes" && !a.startsWith("--original-sender=")))
    throw new Error(
      "Allowed flags: --original-sender=<original sender email>, --yes",
    );
  const sender = args
    .find((a) => a.startsWith("--original-sender="))
    ?.slice("--original-sender=".length);
  if (!sender || !isValidEmail(sender))
    throw new Error(
      "Supply --original-sender with the exact sender used for these bookings, before changing its domain.",
    );
  const bookings = (
    await listBookings({ from: new Date(), status: "confirmed" })
  ).filter((b) => b.email && !b.inviteUid);
  console.log(
    `Project: ${process.env.FIREBASE_PROJECT_ID}. ${bookings.length} upcoming bookings need an invite UID. Original sender: ${sender}.`,
  );
  if (!args.includes("--yes"))
    console.log(
      "Preview only. Verify the original sender, then pass --yes to apply.",
    );
  else {
    const db = getAdminDb();
    for (const booking of bookings) {
      const ref = db.collection("bookings").doc(booking.id);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data();
        if (data?.status === "confirmed" && data.email && !data.inviteUid)
          tx.update(ref, inviteIdentity(booking.id, sender));
      });
    }
    console.log(
      "Backfill complete. Existing invite identities were preserved.",
    );
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
