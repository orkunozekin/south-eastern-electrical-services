import { demoEmulatorProject } from "./emulator";

export function isFirebaseAdminConfigured(): boolean {
  return (
    Boolean(demoEmulatorProject()) ||
    Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
    )
  );
}
