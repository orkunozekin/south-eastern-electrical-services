/** Local demo projects only, so emulator testing can never fall back to production. */
export function demoEmulatorProject(): string | null {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) return null;
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!/^127\.0\.0\.1:\d+$/.test(host) || !project?.startsWith("demo-")) {
    throw new Error(
      "Firestore emulator requires a loopback host and a demo- project ID.",
    );
  }
  return project;
}
