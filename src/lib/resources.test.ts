import { describe, expect, it } from "vitest";
import { buildResourceFilterQuery, getProgrammeOptions, getResourceActionErrorMessage, getResourceOrder, getResourcePageRange, hasMoreResourcePage, normalizeResourceFilters, parseResourceFilters, RESOURCE_PAGE_SIZE, sortResources } from "@/lib/resources";
import type { ResourceWithAuthor } from "@/lib/types";

const baseResource = {
  description: "Une description suffisamment longue pour un support de test.",
  kind: "course" as const,
  subject: "Maths",
  programme: "Cycle ingénieur",
  study_year: "3A" as const,
  link_url: "https://example.com/support",
  file_path: null,
  author_id: "author",
  status: "published" as const,
  updated_at: "2026-08-12T10:00:00.000Z",
  download_count: 0,
  author: null,
};

function resource(id: string, created_at: string, like_count: number): ResourceWithAuthor {
  return { ...baseResource, id, title: id, created_at, like_count };
}

describe("tri du fil de ressources", () => {
  it("met les ressources les plus appréciées en premier", () => {
    const sorted = sortResources([
      resource("recent", "2026-08-12T10:00:00.000Z", 1),
      resource("popular", "2026-08-10T10:00:00.000Z", 4),
    ], "popular");
    expect(sorted.map((item) => item.id)).toEqual(["popular", "recent"]);
  });

  it("départage les ex æquo par date", () => {
    const sorted = sortResources([
      resource("old", "2026-08-10T10:00:00.000Z", 2),
      resource("new", "2026-08-12T10:00:00.000Z", 2),
    ], "popular");
    expect(sorted.map((item) => item.id)).toEqual(["new", "old"]);
  });
});

describe("options de formation", () => {
  it("déduplique les formations sans tenir compte de la casse", () => {
    const options = getProgrammeOptions([
      resource("cycle", "2026-08-12T10:00:00.000Z", 0),
      { ...resource("iim", "2026-08-11T10:00:00.000Z", 0), programme: " IIM " },
      { ...resource("duplicate", "2026-08-10T10:00:00.000Z", 0), programme: "cycle ingénieur" },
    ]);
    expect(options).toEqual(["Cycle ingénieur", "IIM"]);
  });
});

describe("pagination du fil", () => {
  it("calcule une tranche Supabase sans chevauchement", () => {
    expect(getResourcePageRange(0)).toEqual({ from: 0, to: RESOURCE_PAGE_SIZE - 1 });
    expect(getResourcePageRange(24, 24)).toEqual({ from: 24, to: 47 });
  });

  it("considère une page pleine comme potentiellement suivie d’une autre", () => {
    expect(hasMoreResourcePage(23, 24)).toBe(false);
    expect(hasMoreResourcePage(24, 24)).toBe(true);
  });
});

describe("ordre demandé au fil", () => {
  it("ordonne par popularité avant d’appliquer la pagination", () => {
    expect(getResourceOrder("popular")).toEqual([
      { column: "like_count", ascending: false },
      { column: "created_at", ascending: false },
    ]);
    expect(getResourceOrder("recent")).toEqual([{ column: "created_at", ascending: false }]);
  });
});

describe("retours d’action sur une ressource", () => {
  it("fournit un message distinct pour chaque action récupérable", () => {
    const actions = ["like", "save", "file", "delete"] as const;
    const messages = actions.map((action) => getResourceActionErrorMessage(action));

    expect(messages.every((message) => message.length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(actions.length);
  });
});

describe("filtres partageables du fil", () => {
  it("normalise une recherche avant de la conserver", () => {
    expect(normalizeResourceFilters({ search: `  ${"x".repeat(100)}  `, kind: "exam", year: "3A", programme: "  ", sort: "popular" })).toEqual({
      search: "x".repeat(80),
      kind: "exam",
      year: "3A",
      programme: "all",
      sort: "popular",
    });
  });

  it("restaure uniquement les valeurs de filtre reconnues depuis l’URL", () => {
    const filters = parseResourceFilters(new URLSearchParams("q= probabilités &kind=exam&year=3A&programme=Cycle%20ing%C3%A9nieur&sort=popular"));

    expect(filters).toEqual({ search: "probabilités", kind: "exam", year: "3A", programme: "Cycle ingénieur", sort: "popular" });
    expect(parseResourceFilters(new URLSearchParams("kind=unknown&year=9A&sort=old"))).toEqual({ search: "", kind: "all", year: "all", programme: "all", sort: "recent" });
  });

  it("ne met dans l’URL que les filtres actifs", () => {
    expect(buildResourceFilterQuery({ search: " maths ", kind: "all", year: "all", programme: "all", sort: "recent" })).toBe("q=maths");
    expect(buildResourceFilterQuery({ search: "", kind: "summary", year: "2A", programme: "IIM", sort: "popular" })).toBe("kind=summary&year=2A&programme=IIM&sort=popular");
  });
});
