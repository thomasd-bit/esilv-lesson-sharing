import { describe, expect, it } from "vitest";
import { getResourceShareUrl } from "@/lib/share";

describe("liens de partage", () => {
  it("construit une URL canonique vers la fiche ressource", () => {
    expect(getResourceShareUrl("https://passerelle.example/", "resource-123")).toBe("https://passerelle.example/resources/resource-123");
  });
});
