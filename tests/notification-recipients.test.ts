import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPlunkConfigured,
  maskedBootstrapRecipients,
  resolveRecipients,
} from "../lib/plunk";
afterEach(() => vi.unstubAllEnvs());
describe("notification ownership", () => {
  it("uses saved recipients exclusively with the environment as bootstrap fallback", () => {
    vi.stubEnv(
      "BOOKING_NOTIFY_EMAIL",
      "builder@example.com,builder@example.com",
    );
    expect(resolveRecipients([])).toEqual(["builder@example.com"]);
    expect(resolveRecipients(["owner@example.com"])).toEqual([
      "owner@example.com",
    ]);
    expect(maskedBootstrapRecipients().join()).not.toContain("builder@");
  });
  it("checks sender credentials without requiring a bootstrap recipient", () => {
    vi.stubEnv("BOOKING_NOTIFY_EMAIL", "");
    vi.stubEnv("PLUNK_API_KEY", "test-key");
    vi.stubEnv("PLUNK_FROM_EMAIL", "sender@example.com");
    expect(isPlunkConfigured()).toBe(true);
  });
});
