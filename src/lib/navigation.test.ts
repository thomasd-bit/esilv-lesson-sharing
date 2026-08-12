import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/navigation";

describe("redirection après authentification", () => {
  it("conserve un chemin interne", () => {
    expect(safeNextPath("/auth/reset-password")).toBe("/auth/reset-password");
    expect(safeNextPath("/resources/123?from=email")).toBe("/resources/123?from=email");
  });

  it("refuse les destinations externes ou ambiguës", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("https://example.com")).toBe("/");
    expect(safeNextPath("//example.com")).toBe("/");
    expect(safeNextPath("/\\example.com")).toBe("/");
  });
});
