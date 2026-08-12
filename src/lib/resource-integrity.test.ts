import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const metricsMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260812130000_protect_resource_metrics.sql"), "utf8");

describe("intégrité des métriques de ressources", () => {
  it("réserve l’insertion aux colonnes contrôlées par le formulaire", () => {
    expect(metricsMigration).toContain("revoke insert on public.resources from authenticated");
    expect(metricsMigration).toMatch(/grant insert \([\s\S]*author_id\s*\) on public\.resources to authenticated/);
    expect(metricsMigration).not.toContain("like_count");
    expect(metricsMigration).not.toContain("download_count");
  });

  it("réserve la mise à jour aux colonnes éditables par l’auteur", () => {
    expect(metricsMigration).toContain("revoke update on public.resources from authenticated");
    expect(metricsMigration).toMatch(/grant update \([\s\S]*file_path\s*\) on public\.resources to authenticated/);
    expect(metricsMigration).not.toContain("status");
    expect(metricsMigration).not.toContain("like_count");
    expect(metricsMigration).not.toContain("download_count");
  });
});
