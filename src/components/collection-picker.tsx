"use client";

import { useState } from "react";
import { Check, Layers, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ResourceCollection } from "@/lib/types";

type CollectionPickerProps = {
  resourceId: string;
  collections: ResourceCollection[];
  selectedCollectionIds: string[];
  onMembershipChange?: (collectionId: string, added: boolean) => void;
};

export function CollectionPicker({
  resourceId,
  collections,
  selectedCollectionIds,
  onMembershipChange,
}: CollectionPickerProps) {
  const [selected, setSelected] = useState(() => new Set(selectedCollectionIds));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleCollection(collectionId: string, added: boolean) {
    if (busyId) return;
    setBusyId(collectionId);
    setError(null);
    const supabase = createClient();
    const result = added
      ? await supabase.from("resource_collection_items").insert({ collection_id: collectionId, resource_id: resourceId })
      : await supabase.from("resource_collection_items").delete().eq("collection_id", collectionId).eq("resource_id", resourceId);

    if (result.error) {
      setError("La collection n’a pas pu être mise à jour.");
      setBusyId(null);
      return;
    }

    setSelected((current) => {
      const next = new Set(current);
      if (added) next.add(collectionId);
      else next.delete(collectionId);
      return next;
    });
    onMembershipChange?.(collectionId, added);
    setBusyId(null);
  }

  return (
    <details className="collection-picker">
      <summary>
        <span className="collection-picker-title"><Layers size={15} /> Organiser</span>
        <span className="collection-picker-count">{selected.size ? `${selected.size} collection${selected.size > 1 ? "s" : ""}` : "Ajouter"}</span>
      </summary>
      <div className="collection-picker-panel">
        {collections.length === 0 ? <p className="field-hint">Créez une collection pour classer ce support.</p> : collections.map((collection) => {
          const checked = selected.has(collection.id);
          return (
            <label className="collection-option" key={collection.id}>
              <input
                type="checkbox"
                checked={checked}
                disabled={busyId !== null}
                onChange={(event) => void toggleCollection(collection.id, event.target.checked)}
              />
              <span>
                <strong>{collection.name}</strong>
                {collection.description ? <small>{collection.description}</small> : null}
              </span>
              {busyId === collection.id ? <LoaderCircle className="spin" size={15} /> : checked ? <Check size={15} /> : null}
            </label>
          );
        })}
        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
