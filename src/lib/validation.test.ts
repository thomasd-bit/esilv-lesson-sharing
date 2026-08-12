import { describe, expect, it } from "vitest";
import { collectionSchema, passwordResetSchema, profileSchema, resourceSchema, savedSearchSchema, signInSchema, signUpSchema } from "@/lib/validation";

describe("validation des comptes", () => {
  it("accepte une inscription complète", () => {
    const result = signUpSchema.safeParse({
      displayName: "Camille Martin",
      programme: "Cycle ingénieur",
      studyYear: "3A",
      email: "camille@ecole.fr",
      password: "motdepasse-solide",
    });
    expect(result.success).toBe(true);
  });

  it("refuse un mot de passe trop court", () => {
    const result = signInSchema.safeParse({ email: "camille@ecole.fr", password: "court" });
    expect(result.success).toBe(false);
  });

  it("refuse une confirmation de mot de passe différente", () => {
    const result = passwordResetSchema.safeParse({ password: "motdepasse-solide", confirmPassword: "autre-mot-de-passe" });
    expect(result.success).toBe(false);
  });

  it("refuse une année qui n’existe pas dans le référentiel", () => {
    const result = signUpSchema.safeParse({
      displayName: "Camille Martin",
      programme: "Cycle ingénieur",
      studyYear: "semestre 7",
      email: "camille@ecole.fr",
      password: "motdepasse-solide",
    });
    expect(result.success).toBe(false);
  });
});

describe("validation des ressources", () => {
  it("accepte un support qui pointe vers un lien", () => {
    const result = resourceSchema.safeParse({
      title: "Annale de probabilités corrigée",
      description: "Une annale corrigée avec les méthodes à reprendre avant le partiel.",
      kind: "exam",
      subject: "Probabilités",
      programme: "Cycle ingénieur",
      studyYear: "3A",
      linkUrl: "https://drive.example.com/annale",
    });
    expect(result.success).toBe(true);
  });

  it("refuse les liens qui ne sont pas http(s)", () => {
    const result = resourceSchema.safeParse({
      title: "Support de cours utile",
      description: "Un support assez détaillé pour revoir les notions avant le contrôle.",
      kind: "course",
      subject: "Python",
      programme: "Cycle ingénieur",
      studyYear: "2A",
      linkUrl: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });
});

describe("validation des collections", () => {
  it("accepte une collection personnelle", () => {
    const result = collectionSchema.safeParse({
      name: "Révisions de maths",
      description: "Les supports à revoir avant le prochain contrôle.",
    });
    expect(result.success).toBe(true);
  });

  it("refuse un nom de collection trop court", () => {
    const result = collectionSchema.safeParse({ name: "A", description: "" });
    expect(result.success).toBe(false);
  });
});

describe("validation des recherches enregistrées", () => {
  it("accepte un nom de recherche explicite", () => {
    expect(savedSearchSchema.safeParse({ name: "Annales de probabilités" }).success).toBe(true);
  });

  it("refuse un nom vide ou trop court", () => {
    expect(savedSearchSchema.safeParse({ name: " " }).success).toBe(false);
    expect(savedSearchSchema.safeParse({ name: "A" }).success).toBe(false);
  });
});

describe("validation des profils", () => {
  it("accepte une courte présentation", () => {
    const result = profileSchema.safeParse({
      displayName: "Camille Martin",
      programme: "Cycle ingénieur",
      studyYear: "3A",
      bio: "Je partage surtout mes fiches de probabilités et mes retours de projet.",
    });
    expect(result.success).toBe(true);
  });

  it("refuse une présentation trop longue", () => {
    const result = profileSchema.safeParse({
      displayName: "Camille Martin",
      programme: "Cycle ingénieur",
      studyYear: "3A",
      bio: "x".repeat(281),
    });
    expect(result.success).toBe(false);
  });
});
