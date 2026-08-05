import { describe, expect, it } from "vitest";
import {
  generateShareCode,
  normalizeShareCode,
  expirationToDate,
} from "@/lib/db/snippets-repo";

describe("generateShareCode", () => {
  it("is 6 characters long", () => {
    expect(generateShareCode()).toHaveLength(6);
  });

  it("never contains visually similar characters", () => {
    const confusable = /[0O1IL]/;
    for (let i = 0; i < 500; i++) {
      expect(generateShareCode()).not.toMatch(confusable);
    }
  });
});

describe("normalizeShareCode", () => {
  it("strips dashes, trims, and uppercases", () => {
    expect(normalizeShareCode(" ab3-def ")).toBe("AB3DEF");
  });

  it("is case-insensitive", () => {
    expect(normalizeShareCode("ab3def")).toBe(normalizeShareCode("AB3DEF"));
  });
});

describe("expirationToDate", () => {
  const from = new Date("2026-01-01T00:00:00Z");

  it("adds 1 day for 1d", () => {
    expect(expirationToDate("1d", from).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("adds 7 days for 7d", () => {
    expect(expirationToDate("7d", from).toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });

  it("adds 30 days for 30d", () => {
    expect(expirationToDate("30d", from).toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });
});
