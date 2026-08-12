import { describe, expect, it } from "vitest";
import { isMaintainerEmail, isReportStatus, parseMaintainerEmails } from "@/lib/moderation";

describe("accès à la modération", () => {
  it("normalise et dédoublonne la liste des mainteneurs", () => {
    expect(parseMaintainerEmails(" Admin@ecole.fr, admin@ecole.fr , second@ecole.fr ")).toEqual([
      "admin@ecole.fr",
      "second@ecole.fr",
    ]);
  });

  it("limite l’accès aux adresses explicitement configurées", () => {
    expect(isMaintainerEmail("ADMIN@ECOLE.FR", "admin@ecole.fr")).toBe(true);
    expect(isMaintainerEmail("student@ecole.fr", "admin@ecole.fr")).toBe(false);
    expect(isMaintainerEmail(undefined, "admin@ecole.fr")).toBe(false);
  });

  it("n’accepte que les états de signalement connus", () => {
    expect(isReportStatus("open")).toBe(true);
    expect(isReportStatus("reviewed")).toBe(true);
    expect(isReportStatus("archived")).toBe(false);
  });
});
