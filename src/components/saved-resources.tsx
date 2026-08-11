"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, LoaderCircle } from "lucide-react";
import { ResourceCard } from "@/components/resource-card";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Resource, ResourceWithAuthor } from "@/lib/types";

export function SavedResources({ userId }: { userId: string }) {
  const [resources, setResources] = useState<ResourceWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSavedResources() {
      const supabase = createClient();
      const { data: saves, error: savesError } = await supabase.from("resource_saves").select("resource_id, created_at").eq("user_id", userId).order("created_at", { ascending: false });
      if (!active) return;
      if (savesError) { setError("Les sauvegardes ne peuvent pas être chargées."); setLoading(false); return; }
      const ids = (saves ?? []).map((save) => save.resource_id as string);
      if (ids.length === 0) { setLoading(false); return; }
      const { data: rawResources, error: resourcesError } = await supabase.from("resources").select("id, title, description, kind, subject, programme, study_year, link_url, file_path, author_id, status, created_at, updated_at").in("id", ids).eq("status", "published");
      if (resourcesError) { setError("Les ressources sauvegardées ne peuvent pas être chargées."); setLoading(false); return; }
      const rows = (rawResources ?? []) as unknown as Resource[];
      const authorIds = [...new Set(rows.map((resource) => resource.author_id))];
      const { data: rawProfiles } = authorIds.length ? await supabase.from("profiles").select("id, display_name, programme, study_year, avatar_url, created_at").in("id", authorIds) : { data: [] };
      const profiles = (rawProfiles ?? []) as unknown as Profile[];
      const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
      const order = new Map(ids.map((id, index) => [id, index]));
      setResources(rows.map((resource) => ({ ...resource, author: profileById.get(resource.author_id) ?? null })).sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)));
      setLoading(false);
    }
    void loadSavedResources();
    return () => { active = false; };
  }, [userId]);

  if (loading) return <div className="empty-state"><LoaderCircle className="spin" size={25} /><h3>On retrouve vos supports.</h3><p>Un instant.</p></div>;
  if (error) return <div className="empty-state"><Bookmark size={25} /><h3>Impossible d’ouvrir vos sauvegardes.</h3><p>{error}</p></div>;
  if (resources.length === 0) return <div className="empty-state"><Bookmark size={25} /><h3>Votre réserve est encore vide.</h3><p>Quand une ressource vous semble utile, appuyez sur « Garder » pour la retrouver ici.</p><Link className="button button-secondary" href="/">Retourner au fil</Link></div>;
  return <div className="resource-grid">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>;
}

