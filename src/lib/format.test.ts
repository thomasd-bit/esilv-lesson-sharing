import { describe, expect, it } from "vitest";
import { formatDate, formatMetric, initials, notificationMessage, wasEdited } from "@/lib/format";

describe("formatters d’interface", () => {
  it("produit des initiales lisibles", () => {
    expect(initials("Camille Martin")).toBe("CM");
    expect(initials("  Léa  ")).toBe("L");
    expect(initials("")).toBe("?");
  });

  it("formate une date en français", () => {
    expect(formatDate("2026-01-15T12:00:00.000Z")).toMatch(/15/);
  });

  it("affiche les compteurs agrégés sans confondre une erreur avec zéro", () => {
    expect(formatMetric(0)).toBe("0");
    expect(formatMetric(1234)).toMatch(/1.*234/);
    expect(formatMetric(null)).toBe("—");
  });

  it("distingue un commentaire modifié d’un commentaire simplement créé", () => {
    expect(wasEdited("2026-01-15T12:00:00.000Z", "2026-01-15T12:00:00.000Z")).toBe(false);
    expect(wasEdited("2026-01-15T12:00:00.000Z", "2026-01-15T12:00:02.000Z")).toBe(true);
  });

  it("rédige un résumé de notification lisible", () => {
    expect(notificationMessage("like", "Camille Martin", "Annale de probabilités")).toBe("Camille Martin a aimé « Annale de probabilités »");
    expect(notificationMessage("comment", "", "")).toBe("Un étudiant a commenté « une ressource »");
  });
});
