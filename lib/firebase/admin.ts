import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Tolerate a trailing comma copied from service-account JSON.
  if (key.endsWith(",")) {
    key = key.slice(0, -1).trim();
  }

  // Strip one or more layers of wrapping quotes.
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // JSON / .env often store PEM newlines as the two-char sequence \n.
  key = key.replace(/\\n/g, "\n");

  return key.trim();
}

function getServiceAccount(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY looks invalid. Use the PEM from the service account JSON, wrapped in double quotes, with \\n for newlines, and no trailing comma.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }

  return initializeApp({
    credential: cert(getServiceAccount()),
  });
}

/** Server-only Firestore (bookings, availability, settings). */
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/**
 * Server-only Auth (verify admin session tokens).
 * Loaded lazily so Firestore booking paths never pull in firebase-admin/auth
 * (and its jose/jwks-rsa ESM chain) on public pages.
 */
export async function getAdminAuth() {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(getAdminApp());
}
