import type { ResourceWithAuthor } from "@/lib/types";

export type ResourceSort = "recent" | "popular";
export type ResourceAction = "like" | "save" | "file" | "delete";

export type ResourceOrder = { column: "created_at" | "like_count"; ascending: false };

export const RESOURCE_PAGE_SIZE = 24;

export function getResourceActionErrorMessage(action: ResourceAction) {
  const messages: Record<ResourceAction, string> = {
    like: "L’appréciation n’a pas pu être enregistrée. Réessayez dans un instant.",
    save: "La sauvegarde n’a pas pu être mise à jour. Réessayez dans un instant.",
    file: "Le fichier ne peut pas être ouvert pour le moment. Réessayez dans un instant.",
    delete: "La ressource n’a pas pu être supprimée. Réessayez dans un instant.",
  };

  return messages[action];
}

export function getResourcePageRange(offset: number, pageSize = RESOURCE_PAGE_SIZE) {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  return { from: safeOffset, to: safeOffset + safePageSize - 1 };
}

export function hasMoreResourcePage(count: number, pageSize = RESOURCE_PAGE_SIZE) {
  return count >= Math.max(1, Math.floor(pageSize));
}

export function getResourceOrder(sort: ResourceSort): ResourceOrder[] {
  return sort === "popular"
    ? [{ column: "like_count", ascending: false }, { column: "created_at", ascending: false }]
    : [{ column: "created_at", ascending: false }];
}

export function getProgrammeOptions(resources: Pick<ResourceWithAuthor, "programme">[]) {
  const programmes = new Map<string, string>();
  for (const resource of resources) {
    const programme = resource.programme.trim();
    const key = programme.toLocaleLowerCase("fr-FR");
    if (programme && !programmes.has(key)) programmes.set(key, programme);
  }

  return [...programmes.values()].sort((left, right) => left.localeCompare(right, "fr-FR", { sensitivity: "base" }));
}

export function sortResources(resources: ResourceWithAuthor[], sort: ResourceSort) {
  return [...resources].sort((left, right) => {
    if (sort === "popular") {
      const popularityDifference = (right.like_count ?? 0) - (left.like_count ?? 0);
      if (popularityDifference !== 0) return popularityDifference;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}
