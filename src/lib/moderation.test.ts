import { describe, expect, it } from "vitest";
import { getReportPageCount, getReportPageRange, isMaintainerEmail, isReportStatus, isResourceVisibility, latestModerationEvents, parseMaintainerEmails, REPORT_PAGE_SIZE, RESOURCE_VISIBILITY_LABELS } from "@/lib/moderation";

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

  it("prépare des libellés compréhensibles pour le journal de visibilité", () => {
    expect(RESOURCE_VISIBILITY_LABELS.published).toBe("publiée");
    expect(RESOURCE_VISIBILITY_LABELS.hidden).toBe("masquée");
  });

  it("retient la dernière action de chaque ressource", () => {
    const latest = latestModerationEvents([
      { resource_id: "resource-1", created_at: "2026-08-12T10:00:00.000Z", current_status: "hidden" },
      { resource_id: "resource-1", created_at: "2026-08-12T12:00:00.000Z", current_status: "published" },
      { resource_id: "resource-2", created_at: "2026-08-12T11:00:00.000Z", current_status: "hidden" },
    ]);
    expect(latest.get("resource-1")?.current_status).toBe("published");
    expect(latest.get("resource-2")?.current_status).toBe("hidden");
  });

  it("calcule des pages de signalements sans reprendre les mêmes éléments", () => {
    expect(getReportPageRange(1)).toEqual({ from: 0, to: REPORT_PAGE_SIZE - 1 });
    expect(getReportPageRange(3, 50)).toEqual({ from: 100, to: 149 });
    expect(getReportPageCount(0, 50)).toBe(1);
    expect(getReportPageCount(101, 50)).toBe(3);
  });
});
