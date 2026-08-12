import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const visibilityMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260812110000_protect_resource_visibility.sql"), "utf8");

describe("protection de la visibilité des ressources", () => {
  it("installe un trigger avant mise à jour sur les ressources", () => {
    expect(visibilityMigration).toContain("before update on public.resources");
    expect(visibilityMigration).toContain("resources_prevent_direct_visibility_change");
  });

  it("réserve le changement de status au workflow de modération", () => {
    expect(visibilityMigration).toMatch(/old\.status is distinct from new\.status and auth\.uid\(\) is not null/);
    expect(visibilityMigration).toContain("resource_visibility_managed_by_maintainer");
  });
});
