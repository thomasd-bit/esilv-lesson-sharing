import { describe, expect, it } from "vitest";
import { reportSubmissionMessage } from "@/lib/reports";

describe("retour de signalement", () => {
  it("explique un doublon de signalement ouvert", () => {
    expect(reportSubmissionMessage("23505")).toContain("déjà");
  });

  it("conserve un message générique pour les autres erreurs", () => {
    expect(reportSubmissionMessage("42501")).toBe("Le signalement n’a pas pu être envoyé.");
  });
});
