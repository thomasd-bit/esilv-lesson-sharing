"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Layers, LoaderCircle, Plus } from "lucide-react";
import { CollectionPicker } from "@/components/collection-picker";
import { ResourceCard } from "@/components/resource-card";
import { createClient } from "@/lib/supabase/client";
import { collectionSchema, firstValidationError } from "@/lib/validation";
import type { Profile, Resource, ResourceCollection, ResourceCollectionItem, ResourceWithAuthor } from "@/lib/types";

type Membership = Record<string, string[]>;

export function SavedResources({ userId }: { userId: string }) {
  const [resources, setResources] = useState<ResourceWithAuthor[]>([]);
  const [collections, setCollections] = useState<ResourceCollection[]>([]);
  const [membership, setMembership] = useState<Membership>({});
  const [selectedCollectionId, setSelectedCollectionId] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionsUnavailable, setCollectionsUnavailable] = useState<string | null>(null);
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSavedResources() {
      const supabase = createClient();
      const [savesResult, collectionsResult, itemsResult] = await Promise.all([
        supabase.from("resource_saves").select("resource_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("resource_collections").select("id, owner_id, name, description, is_default, created_at, updated_at").eq("owner_id", userId).order("created_at", { ascending: true }),
        supabase.from("resource_collection_items").select("collection_id, resource_id, created_at").order("created_at", { ascending: true }),
      ]);
      if (!active) return;

      if (savesResult.error) {
        setError("Les sauvegardes ne peuvent pas être chargées.");
        setLoading(false);
        return;
      }

      if (collectionsResult.error || itemsResult.error) {
        setCollectionsUnavailable("Les collections ne sont pas encore disponibles. Appliquez la migration Supabase 20260812000000_collections.sql.");
      } else {
        const collectionRows = (collectionsResult.data ?? []) as unknown as ResourceCollection[];
        const itemRows = (itemsResult.data ?? []) as unknown as ResourceCollectionItem[];
        const ownCollectionIds = new Set(collectionRows.map((collection) => collection.id));
        const nextMembership: Membership = {};
        for (const item of itemRows) {
          if (!ownCollectionIds.has(item.collection_id)) continue;
          nextMembership[item.resource_id] = [...(nextMembership[item.resource_id] ?? []), item.collection_id];
        }
        setCollections(collectionRows);
        setMembership(nextMembership);
      }

      const ids = (savesResult.data ?? []).map((save) => save.resource_id as string);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      const { data: rawResources, error: resourcesError } = await supabase
        .from("resources")
        .select("id, title, description, kind, subject, programme, study_year, link_url, file_path, author_id, status, created_at, updated_at")
        .in("id", ids)
        .eq("status", "published");
      if (!active) return;
      if (resourcesError) {
        setError("Les ressources sauvegardées ne peuvent pas être chargées.");
        setLoading(false);
        return;
      }

      const rows = (rawResources ?? []) as unknown as Resource[];
      const authorIds = [...new Set(rows.map((resource) => resource.author_id))];
      const { data: rawProfiles } = authorIds.length
        ? await supabase.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").in("id", authorIds)
        : { data: [] };
      const profiles = (rawProfiles ?? []) as unknown as Profile[];
      const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
      const order = new Map(ids.map((id, index) => [id, index]));
      setResources(rows.map((resource) => ({ ...resource, author: profileById.get(resource.author_id) ?? null })).sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)));
      setLoading(false);
    }

    void loadSavedResources();
    return () => { active = false; };
  }, [userId]);

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
    setSelectedCollectionId(newCollection.id);
    setNewCollectionName("");
    setNewCollectionDescription("");
    setShowCreateForm(false);
    setCollectionSaving(false);
  }

  function updateMembership(resourceId: string, collectionId: string, added: boolean) {
    setMembership((current) => {
      const currentIds = new Set(current[resourceId] ?? []);
      if (added) currentIds.add(collectionId);
      else currentIds.delete(collectionId);
      return { ...current, [resourceId]: [...currentIds] };
    });
  }

  if (loading) return <div className="empty-state"><LoaderCircle className="spin" size={25} /><h3>On retrouve vos supports.</h3><p>Un instant.</p></div>;
  if (error) return <div className="empty-state"><Bookmark size={25} /><h3>Impossible d’ouvrir vos sauvegardes.</h3><p>{error}</p></div>;

  return (
    <>
      <section className="collection-panel" aria-labelledby="collections-title">
        <div className="collection-panel-header">
          <div>
            <span className="eyebrow"><Layers size={13} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Organisation</span>
            <h2 id="collections-title">Mes collections</h2>
            <p>Classez les supports enregistrés selon votre prochaine révision, votre projet ou vos envies.</p>
          </div>
          <button className="button button-secondary button-small" onClick={() => { setShowCreateForm((value) => !value); setCollectionError(null); }} type="button"><Plus size={15} /> Nouvelle collection</button>
        </div>

        {collectionsUnavailable ? <p className="form-error" role="alert">{collectionsUnavailable}</p> : null}

        {showCreateForm ? (
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
          <button className={`collection-tab ${selectedCollectionId === "all" ? "collection-tab-active" : ""}`} onClick={() => setSelectedCollectionId("all")} role="tab" aria-selected={selectedCollectionId === "all"} type="button"><span>Toutes</span><strong>{resources.length}</strong></button>
          {collections.map((collection) => {
            const count = resources.filter((resource) => membership[resource.id]?.includes(collection.id)).length;
            return <button className={`collection-tab ${selectedCollectionId === collection.id ? "collection-tab-active" : ""}`} key={collection.id} onClick={() => setSelectedCollectionId(collection.id)} role="tab" aria-selected={selectedCollectionId === collection.id} type="button"><span>{collection.name}</span><strong>{count}</strong></button>;
          })}
        </div>
      </section>

      {resources.length === 0 ? (
        <div className="empty-state"><Bookmark size={25} /><h3>Votre réserve est encore vide.</h3><p>Quand une ressource vous semble utile, appuyez sur « Garder » pour la retrouver ici.</p><Link className="button button-secondary" href="/">Retourner au fil</Link></div>
      ) : visibleResources.length === 0 ? (
        <div className="empty-state"><Layers size={25} /><h3>Cette collection attend son premier support.</h3><p>Ouvrez une ressource enregistrée et utilisez « Organiser » pour la classer ici.</p><button className="button button-secondary" onClick={() => setSelectedCollectionId("all")} type="button">Voir toutes mes sauvegardes</button></div>
      ) : (
        <div className="resource-grid">{visibleResources.map((resource) => <div className="saved-resource-item" key={resource.id}><ResourceCard resource={resource} /><CollectionPicker resourceId={resource.id} collections={collections} selectedCollectionIds={membership[resource.id] ?? []} onMembershipChange={(collectionId, added) => updateMembership(resource.id, collectionId, added)} /></div>)}</div>
      )}
    </>
  );
}
