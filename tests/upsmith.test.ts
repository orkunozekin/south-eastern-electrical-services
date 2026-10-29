import { describe, expect, it } from "vitest";

import { shouldLoadUpSmithWidget } from "../lib/upsmith";

describe("shouldLoadUpSmithWidget", () => {
  it("loads for production deployments", () => {
    expect(shouldLoadUpSmithWidget("production", "production")).toBe(true);
    expect(shouldLoadUpSmithWidget("production", undefined)).toBe(true);
  });

  it("stays disabled in local development and tests", () => {
    expect(shouldLoadUpSmithWidget("development", undefined)).toBe(false);
    expect(shouldLoadUpSmithWidget("test", undefined)).toBe(false);
  });

  it("stays disabled in non-production Vercel deployments", () => {
    expect(shouldLoadUpSmithWidget("production", "preview")).toBe(false);
    expect(shouldLoadUpSmithWidget("production", "development")).toBe(false);
  });
});
