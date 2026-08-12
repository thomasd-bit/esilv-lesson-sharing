import { describe, expect, it } from "vitest";
import { formatDate, initials, notificationMessage } from "@/lib/format";

describe("formatters d’interface", () => {
  it("produit des initiales lisibles", () => {
    expect(initials("Camille Martin")).toBe("CM");
    expect(initials("  Léa  ")).toBe("L");
    expect(initials("")).toBe("?");
  });

  it("formate une date en français", () => {
    expect(formatDate("2026-01-15T12:00:00.000Z")).toMatch(/15/);
  });

  it("rédige un résumé de notification lisible", () => {
    expect(notificationMessage("like", "Camille Martin", "Annale de probabilités")).toBe("Camille Martin a aimé « Annale de probabilités »");
    expect(notificationMessage("comment", "", "")).toBe("Un étudiant a commenté « une ressource »");
  });
});
