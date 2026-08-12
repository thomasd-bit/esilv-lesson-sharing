"use client";

import { BookOpen, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { ResourceCard } from "@/components/resource-card";
import { createClient } from "@/lib/supabase/client";
import { getResourcePageRange, hasMoreResourcePage, RESOURCE_PAGE_SIZE } from "@/lib/resources";
import type { Profile, Resource, ResourceWithAuthor } from "@/lib/types";

const resourceSelect = "id, title, description, kind, subject, programme, study_year, link_url, file_path, author_id, status, like_count, created_at, updated_at";

export function MemberResources({ member, initialResources, initialHasMore }: { member: Profile; initialResources: Resource[]; initialHasMore: boolean }) {
  const [resources, setResources] = useState(initialResources);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMoreResources() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    const { from, to } = getResourcePageRange(resources.length);
    const { data, error: resourcesError } = await createClient()
      .from("resources")
      .select(resourceSelect)
      .eq("author_id", member.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (resourcesError) {
      setError("Les partages supplémentaires ne peuvent pas être chargés.");
      setLoadingMore(false);
      return;
    }

    const rows = (data ?? []) as Resource[];
    setResources((current) => [...current, ...rows]);
    setHasMore(hasMoreResourcePage(rows.length));
    setLoadingMore(false);
  }

  if (resources.length === 0) {
    return <div className="empty-state"><BookOpen size={25} /><h3>Pas encore de ressource publique.</h3><p>Les prochains partages de ce membre apparaîtront ici.</p></div>;
  }

  const resourceCards: ResourceWithAuthor[] = resources.map((resource) => ({ ...resource, author: member }));

  return <>
    <div className="resource-grid">{resourceCards.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {hasMore ? <div className="load-more-wrap"><button className="button button-secondary" disabled={loadingMore} onClick={() => void loadMoreResources()} type="button">{loadingMore ? <LoaderCircle className="spin" size={16} /> : null}{loadingMore ? "Chargement…" : `Charger les ${RESOURCE_PAGE_SIZE} suivants`}</button><p className="field-hint">Les partages plus anciens restent disponibles en continuant le chargement.</p></div> : null}
  </>;
}
