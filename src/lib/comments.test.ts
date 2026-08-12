import { describe, expect, it } from "vitest";
import { COMMENT_PAGE_SIZE, getCommentRange, hasMoreCommentPage } from "@/lib/comments";

describe("pagination des retours", () => {
  it("calcule des tranches de commentaires sans chevauchement", () => {
    expect(getCommentRange(0)).toEqual({ from: 0, to: COMMENT_PAGE_SIZE - 1 });
    expect(getCommentRange(30, 30)).toEqual({ from: 30, to: 59 });
  });

  it("considère une page pleine comme potentiellement suivie d’une autre", () => {
    expect(hasMoreCommentPage(29, 30)).toBe(false);
    expect(hasMoreCommentPage(30, 30)).toBe(true);
  });
});
