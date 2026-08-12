import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const savedSearchMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260812120000_allow_downloaded_saved_searches.sql"), "utf8");

describe("persistance des tris de recherches", () => {
  it("autorise le tri par téléchargements dans la contrainte SQL", () => {
    expect(savedSearchMigration).toContain("drop constraint saved_resource_searches_sort_check");
    expect(savedSearchMigration).toContain("add constraint saved_resource_searches_sort_check");
    expect(savedSearchMigration).toMatch(/sort in \('recent', 'popular', 'downloaded'\)/);
  });
});
