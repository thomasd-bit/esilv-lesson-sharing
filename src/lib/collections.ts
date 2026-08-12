import type { ResourceCollection } from "@/lib/types";

export function canManageCollection(collection: Pick<ResourceCollection, "is_default">) {
  return !collection.is_default;
}
