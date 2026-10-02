import { afterEach, describe, expect, it, vi } from "vitest";
import { demoEmulatorProject } from "../lib/firebase/emulator";
afterEach(() => vi.unstubAllEnvs());
describe("local emulator safety", () => {
  it("keeps normal credentials when no emulator is configured", () => {
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
    expect(demoEmulatorProject()).toBeNull();
  });
  it("allows only loopback demo projects", () => {
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8085");
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-southeastern-tests");
    expect(demoEmulatorProject()).toBe("demo-southeastern-tests");
    vi.stubEnv("FIREBASE_PROJECT_ID", "production-project");
    expect(() => demoEmulatorProject()).toThrow();
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-southeastern-tests");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "remote.example.com:8085");
    expect(() => demoEmulatorProject()).toThrow();
  });
});
