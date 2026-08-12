import { describe, expect, it } from "vitest";
import { getProfileCompletion } from "@/lib/profile";

describe("complétude du profil", () => {
  it("signale les champs qui manquent", () => {
    expect(getProfileCompletion({ display_name: "Camille", programme: null, study_year: null })).toEqual({ completed: 1, total: 3, percent: 33 });
  });

  it("considère un profil renseigné comme complet", () => {
    expect(getProfileCompletion({ display_name: "Camille Martin", programme: "Cycle ingénieur", study_year: "3A" })).toEqual({ completed: 3, total: 3, percent: 100 });
  });
});
