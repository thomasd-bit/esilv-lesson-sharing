import { RESOURCE_KINDS, STUDY_YEARS, type ResourceKind, type ResourceWithAuthor, type StudyYear } from "@/lib/types";

export type ResourceSort = "recent" | "popular" | "downloaded";
export type ResourceAction = "like" | "save" | "file" | "delete";
export type ResourceFilterState = {
  search: string;
  kind: "all" | ResourceKind;
  year: "all" | StudyYear;
  programme: string;
  sort: ResourceSort;
};

export type ResourceOrder = { column: "created_at" | "like_count" | "download_count"; ascending: false };

export const RESOURCE_PAGE_SIZE = 24;

export function normalizeResourceFilters(filters: ResourceFilterState): ResourceFilterState {
  const programme = filters.programme.trim().slice(0, 80);
  return {
    search: filters.search.trim().slice(0, 80),
    kind: filters.kind,
    year: filters.year,
    programme: programme || "all",
    sort: filters.sort,
  };
}

export function parseResourceFilters(params: URLSearchParams): ResourceFilterState {
  const requestedKind = params.get("kind");
  const requestedYear = params.get("year");
  const requestedSort = params.get("sort");
  const programme = params.get("programme")?.trim().slice(0, 80) ?? "";

  return {
    search: params.get("q")?.trim().slice(0, 80) ?? "",
    kind: RESOURCE_KINDS.some(({ value }) => value === requestedKind) ? requestedKind as ResourceKind : "all",
    year: STUDY_YEARS.includes(requestedYear as StudyYear) ? requestedYear as StudyYear : "all",
    programme: programme || "all",
    sort: requestedSort === "popular" || requestedSort === "downloaded" ? requestedSort : "recent",
  };
}

export function buildResourceFilterQuery(filters: ResourceFilterState) {
  const normalized = normalizeResourceFilters(filters);
  const params = new URLSearchParams();
  const search = normalized.search;
  const programme = normalized.programme;
  if (search) params.set("q", search);
  if (normalized.kind !== "all") params.set("kind", normalized.kind);
  if (normalized.year !== "all") params.set("year", normalized.year);
  if (programme && programme !== "all") params.set("programme", programme);
  if (normalized.sort !== "recent") params.set("sort", normalized.sort);
  return params.toString();
}

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
  if (sort === "popular") return [{ column: "like_count", ascending: false }, { column: "created_at", ascending: false }];
  if (sort === "downloaded") return [{ column: "download_count", ascending: false }, { column: "created_at", ascending: false }];
  return [{ column: "created_at", ascending: false }];
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
    if (sort === "downloaded") {
      const downloadDifference = Number(right.download_count ?? 0) - Number(left.download_count ?? 0);
      if (downloadDifference !== 0) return downloadDifference;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}
