import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminAuth } from "@/lib/firebase/admin";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "./constants";

export async function createSessionCookie(idToken: string): Promise<string> {
  const auth = await getAdminAuth();
  return auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
}

export async function verifySessionCookie(session: string) {
  const auth = await getAdminAuth();
  return auth.verifySessionCookie(session, true);
}

export async function getSessionCookieValue(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value;
}

export async function getVerifiedAdmin(): Promise<{
  uid: string;
  email?: string;
} | null> {
  if (!isFirebaseAdminConfigured()) return null;

  const session = await getSessionCookieValue();
  if (!session) return null;

  try {
    const decoded = await verifySessionCookie(session);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

/** Redirects to login when there is no valid admin session. */
export async function requireAdmin(): Promise<{
  uid: string;
  email?: string;
}> {
  const admin = await getVerifiedAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}
