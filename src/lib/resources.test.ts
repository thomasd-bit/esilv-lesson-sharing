import { describe, expect, it } from "vitest";
import { sortResources } from "@/lib/resources";
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
