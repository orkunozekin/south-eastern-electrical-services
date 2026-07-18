/**
 * Clears all Firestore booking + slot docs.
 *
 * Usage (from project root):
 *   node --env-file=.env.local scripts/clear-bookings.mjs
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

await deleteCollection("bookings");
await deleteCollection("slots");
console.log("All bookings and occupied slots cleared.");
