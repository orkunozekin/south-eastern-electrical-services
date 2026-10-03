/**
 * Clears all Firestore booking, slot, and day-lock docs. Customers are NOT notified.
 *
 * Usage (from project root):
 *   node --env-file=.env.local scripts/clear-bookings.mjs        # dry run
 *   node --env-file=.env.local scripts/clear-bookings.mjs --yes  # delete
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

function privateKey() {
  let key = process.env.FIREBASE_PRIVATE_KEY ?? "";
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  return key.replace(/\\n/g, "\n");
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey(),
    }),
  });
}

const db = getFirestore();
const BATCH = 400;

async function deleteCollection(name) {
  const col = db.collection(name);
  let total = 0;

  for (;;) {
    const snap = await col.limit(BATCH).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
    console.log(`Deleted ${total} from ${name}…`);
  }

  console.log(`Done: ${name} (${total} docs)`);
}

const upcoming = (
  await db.collection("bookings").where("startsAt", ">=", Timestamp.now()).get()
).docs.filter((doc) => doc.data().status === "confirmed");
const withEmail = upcoming.filter((doc) => doc.data().email).length;

console.log(
  `Project ${process.env.FIREBASE_PROJECT_ID}: ${upcoming.length} upcoming confirmed booking(s), ${withEmail} with an email.`,
);
if (upcoming.length > 0) {
  console.log(
    "These customers will NOT be emailed. Cancel them from the admin Bookings page instead if they should be told.",
  );
}

if (!process.argv.includes("--yes")) {
  console.log(
    "Dry run. Re-run with --yes to delete all bookings, slots, and day locks.",
  );
  process.exit(0);
}

await deleteCollection("bookings");
await deleteCollection("slots");
await deleteCollection("bookingDays");
console.log("All bookings, occupied slots, and day locks cleared.");
