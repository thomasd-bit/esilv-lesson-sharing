import { describe, expect, it } from "vitest";
import { getReportPageCount, getReportPageRange, isMaintainerEmail, isReportStatus, isResourceVisibility, parseMaintainerEmails, REPORT_PAGE_SIZE } from "@/lib/moderation";

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

  it("n’accepte que les états de visibilité d’une ressource connus", () => {
    expect(isResourceVisibility("published")).toBe(true);
    expect(isResourceVisibility("hidden")).toBe(true);
    expect(isResourceVisibility("deleted")).toBe(false);
  });

  it("calcule des pages de signalements sans reprendre les mêmes éléments", () => {
    expect(getReportPageRange(1)).toEqual({ from: 0, to: REPORT_PAGE_SIZE - 1 });
    expect(getReportPageRange(3, 50)).toEqual({ from: 100, to: 149 });
    expect(getReportPageCount(0, 50)).toBe(1);
    expect(getReportPageCount(101, 50)).toBe(3);
  });
});
