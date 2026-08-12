"use client";

import Link from "next/link";
import { Bookmark, Layers, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CollectionPicker } from "@/components/collection-picker";
import { ResourceCard } from "@/components/resource-card";
import { formatMetric } from "@/lib/format";
import { canManageCollection } from "@/lib/collections";
import { getResourcePageRange, hasMoreResourcePage, RESOURCE_PAGE_SIZE } from "@/lib/resources";
import { createClient } from "@/lib/supabase/client";
import { collectionSchema, firstValidationError } from "@/lib/validation";
import type { Profile, Resource, ResourceCollection, ResourceCollectionItem, ResourceWithAuthor } from "@/lib/types";

type Membership = Record<string, string[]>;
type CollectionCounts = Record<string, number | null>;

type SavedPage = {
  resources: ResourceWithAuthor[];
  membership: Membership;
  nextOffset: number;
  totalSavedCount: number | null;
  hasMore: boolean;
  collectionsError: boolean;
};

const resourceSelect = "id, title, description, kind, subject, programme, study_year, link_url, file_path, author_id, status, like_count, download_count, created_at, updated_at";

async function fetchSavedPage(userId: string, offset: number, collections: ResourceCollection[]): Promise<SavedPage> {
  const supabase = createClient();
  const { from, to } = getResourcePageRange(offset);
  const { data: rawSaves, error: savesError, count: totalSavedCount } = await supabase
    .from("resource_saves")
    .select("resource_id, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (savesError) throw savesError;

  const saveRows = (rawSaves ?? []) as Array<{ resource_id: string; created_at: string }>;
  const ids = saveRows.map((save) => save.resource_id);
  const { data: rawResources, error: resourcesError } = ids.length
    ? await supabase.from("resources").select(resourceSelect).in("id", ids).eq("status", "published")
    : { data: [], error: null };
  if (resourcesError) throw resourcesError;

  const rows = (rawResources ?? []) as unknown as Resource[];
  const authorIds = [...new Set(rows.map((resource) => resource.author_id))];
  const { data: rawProfiles } = authorIds.length
    ? await supabase.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").in("id", authorIds)
    : { data: [] };
  const profiles = (rawProfiles ?? []) as unknown as Profile[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const order = new Map(ids.map((id, index) => [id, index]));
  const resources = rows
    .map((resource) => ({ ...resource, author: profileById.get(resource.author_id) ?? null }))
    .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));

  let itemRows: ResourceCollectionItem[] = [];
  let collectionsError = false;
  if (collections.length > 0 && ids.length > 0) {
    const { data: rawItems, error: itemsError } = await supabase
      .from("resource_collection_items")
      .select("collection_id, resource_id, created_at")
      .in("collection_id", collections.map((collection) => collection.id))
      .in("resource_id", ids);
    if (itemsError) collectionsError = true;
    else itemRows = (rawItems ?? []) as unknown as ResourceCollectionItem[];
  }

  const ownCollectionIds = new Set(collections.map((collection) => collection.id));
  const membership: Membership = {};
  for (const item of itemRows) {
    if (!ownCollectionIds.has(item.collection_id)) continue;
    membership[item.resource_id] = [...(membership[item.resource_id] ?? []), item.collection_id];
  }

  return {
    resources,
    membership,
    nextOffset: offset + saveRows.length,
    totalSavedCount: totalSavedCount ?? null,
    hasMore: totalSavedCount === null
      ? hasMoreResourcePage(saveRows.length)
      : offset + saveRows.length < totalSavedCount,
    collectionsError,
  };
}

async function fetchCollectionCounts(collections: ResourceCollection[]) {
  const results = await Promise.all(collections.map(async (collection) => {
    const { count, error } = await createClient()
      .from("resource_collection_items")
      .select("resource_id", { count: "exact", head: true })
      .eq("collection_id", collection.id);
    return { id: collection.id, count: error ? null : count ?? 0, error: Boolean(error) };
  }));

  return {
    counts: Object.fromEntries(results.map((result) => [result.id, result.count])) as CollectionCounts,
    hasError: results.some((result) => result.error),
  };
}

function mergeMembership(current: Membership, next: Membership) {
  return Object.entries(next).reduce<Membership>((merged, [resourceId, collectionIds]) => {
    merged[resourceId] = collectionIds;
    return merged;
  }, { ...current });
}

export function SavedResources({ userId }: { userId: string }) {
  const [resources, setResources] = useState<ResourceWithAuthor[]>([]);
  const [collections, setCollections] = useState<ResourceCollection[]>([]);
  const [membership, setMembership] = useState<Membership>({});
  const [collectionCounts, setCollectionCounts] = useState<CollectionCounts>({});
  const [selectedCollectionId, setSelectedCollectionId] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState("");
  const [editingCollectionDescription, setEditingCollectionDescription] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionsUnavailable, setCollectionsUnavailable] = useState<string | null>(null);
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [collectionUpdating, setCollectionUpdating] = useState(false);
  const [collectionDeletingId, setCollectionDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSavedCount, setTotalSavedCount] = useState<number | null>(null);
  const [nextSaveOffset, setNextSaveOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    const requestId = ++requestIdRef.current;

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data: rawCollections, error: collectionsError } = await supabase
        .from("resource_collections")
        .select("id, owner_id, name, description, is_default, created_at, updated_at")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true });
      if (!active || requestId !== requestIdRef.current) return;

      const collectionRows = (rawCollections ?? []) as unknown as ResourceCollection[];
      if (collectionsError) {
        setCollectionsUnavailable("Les collections ne sont pas encore disponibles. Appliquez la migration Supabase 20260812000000_collections.sql.");
      } else {
        setCollections(collectionRows);
      }

      try {
        const [page, collectionCountResult] = await Promise.all([
          fetchSavedPage(userId, 0, collectionsError ? [] : collectionRows),
          collectionsError ? Promise.resolve({ counts: {}, hasError: false }) : fetchCollectionCounts(collectionRows),
        ]);
        if (!active || requestId !== requestIdRef.current) return;
        setResources(page.resources);
        setMembership(page.membership);
        setCollectionCounts(collectionCountResult.counts);
        setTotalSavedCount(page.totalSavedCount);
        setNextSaveOffset(page.nextOffset);
        setHasMore(page.hasMore);
        if (page.collectionsError || collectionCountResult.hasError) {
          setCollectionsUnavailable("Les compteurs de collections ne sont pas disponibles pour le moment.");
        }
      } catch {
        if (active && requestId === requestIdRef.current) setError("Les ressources sauvegardées ne peuvent pas être chargées.");
      } finally {
        if (active && requestId === requestIdRef.current) setLoading(false);
      }
    }

    void loadInitialData();
    return () => { active = false; };
  }, [userId]);

  async function loadMoreResources() {
    if (loading || loadingMore || !hasMore) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchSavedPage(userId, nextSaveOffset, collections);
      if (requestId !== requestIdRef.current) return;
      setResources((current) => [...current, ...page.resources]);
      setMembership((current) => mergeMembership(current, page.membership));
      setTotalSavedCount(page.totalSavedCount);
      setNextSaveOffset(page.nextOffset);
      setHasMore(page.hasMore);
      if (page.collectionsError) setCollectionsUnavailable("Les compteurs de collections ne sont pas disponibles pour le moment.");
    } catch {
      if (requestId === requestIdRef.current) setError("Les sauvegardes supplémentaires ne peuvent pas être chargées.");
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }

  const visibleResources = useMemo(
    () => selectedCollectionId === "all" ? resources : resources.filter((resource) => membership[resource.id]?.includes(selectedCollectionId)),
    [membership, resources, selectedCollectionId],
  );

  async function createCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = collectionSchema.safeParse({ name: newCollectionName, description: newCollectionDescription });
    if (!parsed.success) {
      setCollectionError(firstValidationError(parsed.error));
      return;
    }
    setCollectionSaving(true);
    setCollectionError(null);
    const { data, error: insertError } = await createClient().from("resource_collections").insert({
      owner_id: userId,
      name: parsed.data.name,
      description: parsed.data.description,
    }).select("id, owner_id, name, description, is_default, created_at, updated_at").single();
    if (insertError || !data) {
      setCollectionError(insertError?.code === "23505" ? "Vous avez déjà une collection avec ce nom." : "La collection n’a pas pu être créée.");
      setCollectionSaving(false);
      return;
    }
    const newCollection = data as unknown as ResourceCollection;
    setCollections((current) => [...current, newCollection]);
    setCollectionCounts((current) => ({ ...current, [newCollection.id]: 0 }));
    setSelectedCollectionId(newCollection.id);
    setNewCollectionName("");
    setNewCollectionDescription("");
    setShowCreateForm(false);
    setCollectionSaving(false);
  }

  function startEditingCollection(collection: ResourceCollection) {
    setShowCreateForm(false);
    setEditingCollectionId(collection.id);
    setEditingCollectionName(collection.name);
    setEditingCollectionDescription(collection.description);
    setCollectionError(null);
  }

  function cancelEditingCollection() {
    setEditingCollectionId(null);
    setEditingCollectionName("");
    setEditingCollectionDescription("");
    setCollectionError(null);
  }

  async function updateCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCollectionId) return;
    const parsed = collectionSchema.safeParse({ name: editingCollectionName, description: editingCollectionDescription });
    if (!parsed.success) {
      setCollectionError(firstValidationError(parsed.error));
      return;
    }
    setCollectionUpdating(true);
    setCollectionError(null);
    try {
      const { data, error: updateError } = await createClient()
        .from("resource_collections")
        .update({ name: parsed.data.name, description: parsed.data.description })
        .eq("id", editingCollectionId)
        .eq("owner_id", userId)
        .select("id, owner_id, name, description, is_default, created_at, updated_at")
        .single();
      if (updateError || !data) {
        setCollectionError(updateError?.code === "23505" ? "Vous avez déjà une collection avec ce nom." : "La collection n’a pas pu être modifiée.");
        return;
      }
      const updatedCollection = data as unknown as ResourceCollection;
      setCollections((current) => current.map((collection) => collection.id === updatedCollection.id ? updatedCollection : collection));
      cancelEditingCollection();
    } finally {
      setCollectionUpdating(false);
    }
  }

  async function deleteCollection(collection: ResourceCollection) {
    if (collection.is_default || collectionDeletingId) return;
    if (!window.confirm(`Supprimer la collection « ${collection.name} » ? Les ressources resteront sauvegardées, mais ne seront plus classées ici.`)) return;
    setCollectionDeletingId(collection.id);
    setCollectionError(null);
    try {
      const { error: deleteError } = await createClient()
        .from("resource_collections")
        .delete()
        .eq("id", collection.id)
        .eq("owner_id", userId);
      if (deleteError) {
        setCollectionError("La collection n’a pas pu être supprimée.");
        return;
      }
      setCollections((current) => current.filter((item) => item.id !== collection.id));
      setCollectionCounts((current) => {
        const next = { ...current };
        delete next[collection.id];
        return next;
      });
      setMembership((current) => Object.fromEntries(Object.entries(current).map(([resourceId, collectionIds]) => [resourceId, collectionIds.filter((id) => id !== collection.id)])));
      if (selectedCollectionId === collection.id) setSelectedCollectionId("all");
      if (editingCollectionId === collection.id) cancelEditingCollection();
    } finally {
      setCollectionDeletingId(null);
    }
  }

  function updateMembership(resourceId: string, collectionId: string, added: boolean) {
    setMembership((current) => {
      const currentIds = new Set(current[resourceId] ?? []);
      if (added) currentIds.add(collectionId);
      else currentIds.delete(collectionId);
      return { ...current, [resourceId]: [...currentIds] };
    });
    setCollectionCounts((current) => {
      const count = current[collectionId];
      if (count === null || count === undefined) return current;
      return { ...current, [collectionId]: Math.max(0, count + (added ? 1 : -1)) };
    });
  }

  if (loading) return <div className="empty-state"><LoaderCircle className="spin" size={25} /><h3>On retrouve vos supports.</h3><p>Un instant.</p></div>;
  if (error && resources.length === 0) return <div className="empty-state"><Bookmark size={25} /><h3>Impossible d’ouvrir vos sauvegardes.</h3><p>{error}</p></div>;

  return (
    <>
      <section className="collection-panel" aria-labelledby="collections-title">
        <div className="collection-panel-header">
          <div>
            <span className="eyebrow"><Layers size={13} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Organisation</span>
            <h2 id="collections-title">Mes collections</h2>
            <p>Classez les supports enregistrés selon votre prochaine révision, votre projet ou vos envies.</p>
          </div>
          <button className="button button-secondary button-small" onClick={() => { setShowCreateForm((value) => !value); cancelEditingCollection(); setCollectionError(null); }} type="button"><Plus size={15} /> Nouvelle collection</button>
        </div>

        {collectionsUnavailable ? <p className="form-error" role="alert">{collectionsUnavailable}</p> : null}

        {editingCollectionId ? (
          <form className="collection-form" onSubmit={(event) => void updateCollection(event)}>
            <div className="form-grid">
              <label className="field" htmlFor="editingCollectionName"><span>Nom</span><input id="editingCollectionName" maxLength={60} value={editingCollectionName} onChange={(event) => setEditingCollectionName(event.target.value)} /></label>
              <label className="field" htmlFor="editingCollectionDescription"><span>Description <em>(facultatif)</em></span><input id="editingCollectionDescription" maxLength={160} value={editingCollectionDescription} onChange={(event) => setEditingCollectionDescription(event.target.value)} /></label>
            </div>
            <div className="inline-actions collection-form-actions">
              {collectionError ? <span className="field-error" role="alert">{collectionError}</span> : null}
              <button className="button button-quiet button-small" onClick={cancelEditingCollection} type="button"><X size={15} /> Annuler</button>
              <button className="button button-primary button-small" disabled={collectionUpdating} type="submit">{collectionUpdating ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />} {collectionUpdating ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </form>
        ) : showCreateForm ? (
          <form className="collection-form" onSubmit={(event) => void createCollection(event)}>
            <div className="form-grid">
              <label className="field"><span>Nom</span><input autoFocus maxLength={60} value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} placeholder="Ex. Révisions de maths" /></label>
              <label className="field"><span>Description <em>(facultatif)</em></span><input maxLength={160} value={newCollectionDescription} onChange={(event) => setNewCollectionDescription(event.target.value)} placeholder="Ce que vous voulez retrouver ici" /></label>
            </div>
            <div className="inline-actions collection-form-actions">
              {collectionError ? <span className="field-error" role="alert">{collectionError}</span> : null}
              <button className="button button-primary button-small" disabled={collectionSaving} type="submit">{collectionSaving ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Créer la collection</button>
            </div>
          </form>
        ) : null}

        <div className="collection-tabs" role="tablist" aria-label="Filtrer par collection">
          <button className={`collection-tab ${selectedCollectionId === "all" ? "collection-tab-active" : ""}`} onClick={() => setSelectedCollectionId("all")} role="tab" aria-selected={selectedCollectionId === "all"} type="button"><span>Toutes</span><strong>{formatMetric(totalSavedCount)}</strong></button>
          {collections.map((collection) => <button className={`collection-tab ${selectedCollectionId === collection.id ? "collection-tab-active" : ""}`} key={collection.id} onClick={() => setSelectedCollectionId(collection.id)} role="tab" aria-selected={selectedCollectionId === collection.id} type="button"><span>{collection.name}</span><strong>{formatMetric(collectionCounts[collection.id] ?? null)}</strong></button>)}
        </div>
        {collections.some((collection) => !collection.is_default) ? (
          <div className="collection-management" aria-label="Gérer mes collections">
            {collections.filter(canManageCollection).map((collection) => (
              <div className={`collection-management-item ${editingCollectionId === collection.id ? "collection-management-item-active" : ""}`} key={collection.id}>
                <div><strong>{collection.name}</strong><small>{formatMetric(collectionCounts[collection.id] ?? null)} support{collectionCounts[collection.id] === 1 ? "" : "s"}</small></div>
                <div className="collection-management-actions">
                  <button className="text-button" aria-label={`Modifier ${collection.name}`} disabled={Boolean(collectionDeletingId) || collectionUpdating} onClick={() => startEditingCollection(collection)} type="button"><Pencil size={14} /> Modifier</button>
                  <button className="text-button comment-delete-button" aria-label={`Supprimer ${collection.name}`} disabled={Boolean(collectionDeletingId) || collectionUpdating} onClick={() => void deleteCollection(collection)} type="button">{collectionDeletingId === collection.id ? <LoaderCircle className="spin" size={14} /> : <Trash2 size={14} />} Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {resources.length === 0 ? (
        <div className="empty-state"><Bookmark size={25} /><h3>{totalSavedCount ? "Aucune ressource accessible." : "Votre réserve est encore vide."}</h3><p>{totalSavedCount ? "Les ressources sauvegardées ne sont plus publiées ou ne sont plus accessibles." : "Quand une ressource vous semble utile, appuyez sur « Garder » pour la retrouver ici."}</p><Link className="button button-secondary" href="/">Retourner au fil</Link></div>
      ) : visibleResources.length === 0 ? (
        <div className="empty-state"><Layers size={25} /><h3>Cette collection attend son premier support.</h3><p>Ouvrez une ressource enregistrée et utilisez « Organiser » pour la classer ici.</p><button className="button button-secondary" onClick={() => setSelectedCollectionId("all")} type="button">Voir toutes mes sauvegardes</button></div>
      ) : (
        <>
          <div className="resource-grid">{visibleResources.map((resource) => <div className="saved-resource-item" key={resource.id}><ResourceCard resource={resource} /><CollectionPicker resourceId={resource.id} collections={collections} selectedCollectionIds={membership[resource.id] ?? []} onMembershipChange={(collectionId, added) => updateMembership(resource.id, collectionId, added)} /></div>)}</div>
          {hasMore ? <div className="load-more-wrap"><button className="button button-secondary" disabled={loadingMore} onClick={() => void loadMoreResources()} type="button">{loadingMore ? <LoaderCircle className="spin" size={16} /> : null}{loadingMore ? "Chargement…" : `Charger les ${RESOURCE_PAGE_SIZE} suivantes`}</button><p className="field-hint">Les sauvegardes plus anciennes restent disponibles en continuant le chargement.</p></div> : null}
        </>
      )}
    </>
  );
}
