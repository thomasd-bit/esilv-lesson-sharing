import type { ResourceWithAuthor } from "@/lib/types";

export type ResourceSort = "recent" | "popular";

export function sortResources(resources: ResourceWithAuthor[], sort: ResourceSort) {
  return [...resources].sort((left, right) => {
    if (sort === "popular") {
      const popularityDifference = (right.like_count ?? 0) - (left.like_count ?? 0);
      if (popularityDifference !== 0) return popularityDifference;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}
