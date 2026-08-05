import { describe, expect, it } from "vitest";
import { scanForSecrets } from "@/lib/secret-scan";

describe("scanForSecrets", () => {
  it("flags an AWS access key", () => {
    const matches = scanForSecrets("const key = 'AKIAABCDEFGHIJKLMNOP';");
    expect(matches.some((m) => m.label === "AWS access key")).toBe(true);
  });

  it("flags a private key block", () => {
    const matches = scanForSecrets("-----BEGIN RSA PRIVATE KEY-----\nMIIB...");
    expect(matches.some((m) => m.label === "private key block")).toBe(true);
  });

  it("flags a GitHub token", () => {
    const matches = scanForSecrets("ghp_1234567890abcdefghijklmnopqrstuvwx");
    expect(matches.some((m) => m.label === "GitHub token")).toBe(true);
  });

  it("does not flag ordinary code", () => {
    const matches = scanForSecrets("function add(a, b) { return a + b; }");
    expect(matches).toHaveLength(0);
  });
});
