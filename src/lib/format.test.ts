import { describe, expect, it } from "vitest";
import { formatDate, initials } from "@/lib/format";

describe("formatters d’interface", () => {
  it("produit des initiales lisibles", () => {
    expect(initials("Camille Martin")).toBe("CM");
    expect(initials("  Léa  ")).toBe("L");
    expect(initials("")).toBe("?");
  });

  it("formate une date en français", () => {
    expect(formatDate("2026-01-15T12:00:00.000Z")).toMatch(/15/);
  });
});

