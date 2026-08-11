import { describe, expect, it } from "vitest";
import { resourceSchema, signInSchema, signUpSchema } from "@/lib/validation";

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

