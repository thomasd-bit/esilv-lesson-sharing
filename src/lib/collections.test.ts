import { describe, expect, it } from "vitest";
import { canManageCollection } from "@/lib/collections";

describe("gestion des collections", () => {
  it("protège la collection par défaut tout en laissant gérer les collections personnelles", () => {
    expect(canManageCollection({ is_default: true })).toBe(false);
    expect(canManageCollection({ is_default: false })).toBe(true);
  });
});
