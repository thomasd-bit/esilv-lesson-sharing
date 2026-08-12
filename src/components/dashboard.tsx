"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, FilePlus2, LoaderCircle, Search, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ResourceCard } from "@/components/resource-card";
import { createClient } from "@/lib/supabase/client";
import { appConfig } from "@/lib/config";
import { getProfileCompletion } from "@/lib/profile";
import { sortResources, type ResourceSort } from "@/lib/resources";
import { RESOURCE_KINDS, STUDY_YEARS, type Profile, type Resource, type ResourceKind, type ResourceWithAuthor, type StudyYear } from "@/lib/types";

type DashboardProps = {
  email: string;
  profile: Profile | null;
  userId: string;
};

export function Dashboard({ email, profile, userId }: DashboardProps) {
  const [resources, setResources] = useState<ResourceWithAuthor[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kind, setKind] = useState<"all" | ResourceKind>("all");
  const [year, setYear] = useState<"all" | StudyYear>("all");
  const [sort, setSort] = useState<ResourceSort>("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;

    async function loadResources() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      let request = supabase
        .from("resources")
        .select("id, title, description, kind, subject, programme, study_year, link_url, file_path, author_id, status, created_at, updated_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(100);

      if (kind !== "all") {
        request = request.eq("kind", kind);
      }
      if (year !== "all") {
        request = request.eq("study_year", year);
      }

      const cleanedSearch = debouncedSearch.replace(/[,%()]/g, " ").slice(0, 80);
      if (cleanedSearch) {
        request = request.or(`title.ilike.%${cleanedSearch}%,description.ilike.%${cleanedSearch}%,subject.ilike.%${cleanedSearch}%`);
      }

      const { data, error: resourcesError } = await request;
      if (!active) return;
      if (resourcesError) {
        setError("Les ressources ne peuvent pas être chargées pour le moment.");
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Resource[];
      const authorIds = [...new Set(rows.map((resource) => resource.author_id))];
      const resourceIds = rows.map((resource) => resource.id);
      const [{ data: profiles }, { data: likes }] = await Promise.all([
        authorIds.length
          ? supabase.from("profiles").select("id, display_name, programme, study_year, avatar_url, created_at").in("id", authorIds)
          : Promise.resolve({ data: [] }),
        resourceIds.length
          ? supabase.from("resource_likes").select("resource_id").in("resource_id", resourceIds)
          : Promise.resolve({ data: [] }),
      ]);
      const profileRows = (profiles ?? []) as unknown as Profile[];
      const profileById = new Map(profileRows.map((author) => [author.id, author]));
      const likeCounts = new Map<string, number>();
      for (const like of (likes ?? []) as Array<{ resource_id: string }>) {
        likeCounts.set(like.resource_id, (likeCounts.get(like.resource_id) ?? 0) + 1);
      }

      setResources(rows.map((resource) => ({
        ...resource,
        author: profileById.get(resource.author_id) ?? null,
        like_count: likeCounts.get(resource.id) ?? 0,
      })));
      setLoading(false);
    }

    void loadResources();
    return () => { active = false; };
  }, [debouncedSearch, kind, year]);

  const visibleResources = useMemo(() => sortResources(resources, sort), [resources, sort]);
  const programmeCount = useMemo(() => new Set(visibleResources.map((resource) => resource.programme)).size, [visibleResources]);
  const displayName = profile?.display_name ?? email.split("@")[0] ?? "Étudiant";
  const profileCompletion = getProfileCompletion(profile);

  return (
    <div className="app-page">
      <AppHeader displayName={displayName} email={email} userId={userId} />
      <main id="main-content" className="content-wrap">
        <section className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Bonjour {displayName.split(" ")[0]}</span>
            <h1>Ce que la promo a appris, la promo le garde.</h1>
            <p>{appConfig.description} Trouvez une ressource, ajoutez votre retour, puis transmettez ce qui vous a débloqué.</p>
          </div>
          <aside className="hero-aside">
            <div className="profile-card">
              <div className="profile-card-top">
                <span className="avatar">{displayName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{displayName}</strong>
                  <small>{profile?.programme ?? "Formation à renseigner"}</small>
                </div>
              </div>
              <div className="profile-meta">
                {profile?.study_year ? <span className="pill">{profile.study_year}</span> : null}
                <span className="pill pill-coral">Étudiant vérifié</span>
              </div>
            </div>
            {profileCompletion.percent < 100 ? (
              <div className="profile-completion-card">
                <div className="profile-completion-top"><span>Profil à compléter</span><strong>{profileCompletion.percent}%</strong></div>
                <div className="profile-progress" role="progressbar" aria-label="Complétude du profil" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompletion.percent}><span style={{ width: `${profileCompletion.percent}%` }} /></div>
                <p>Ajoutez votre formation et votre année pour apparaître dans les bons filtres.</p>
                <Link className="button button-secondary button-small" href="/profile">Compléter mon profil</Link>
              </div>
            ) : null}
          </aside>
        </section>

        <section className="stats-grid" aria-label="Aperçu de la communauté">
          <div className="stat-card"><span className="stat-value">{visibleResources.length}</span><span className="stat-label">ressources visibles</span></div>
          <div className="stat-card"><span className="stat-value">{programmeCount}</span><span className="stat-label">formations représentées</span></div>
          <div className="stat-card"><span className="stat-value">{new Set(visibleResources.map((resource) => resource.subject)).size}</span><span className="stat-label">matières couvertes</span></div>
        </section>

        <section id="ressources">
          <div className="section-heading">
            <div>
              <h2>{sort === "recent" ? "Les dernières ressources" : "Les plus appréciées"}</h2>
              <p>Les supports déposés par les étudiants de la communauté.</p>
            </div>
            <Link className="button button-secondary button-small" href="/resources/new"><FilePlus2 size={15} /> Déposer un support</Link>
          </div>
          <div className="filters">
            <label className="search-wrap">
              <Search size={17} aria-hidden="true" />
              <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une matière, une fiche…" aria-label="Rechercher une ressource" />
            </label>
            <select className="filter-select" value={kind} onChange={(event) => setKind(event.target.value as "all" | ResourceKind)} aria-label="Filtrer par type">
              <option value="all">Tous les types</option>
              {RESOURCE_KINDS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="filter-select" value={year} onChange={(event) => setYear(event.target.value as "all" | StudyYear)} aria-label="Filtrer par année">
              <option value="all">Toutes les années</option>
              {STUDY_YEARS.map((studyYear) => <option key={studyYear} value={studyYear}>{studyYear}</option>)}
            </select>
            <select className="filter-select" value={sort} onChange={(event) => setSort(event.target.value as ResourceSort)} aria-label="Trier les ressources">
              <option value="recent">Plus récentes</option>
              <option value="popular">Plus appréciées</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state"><LoaderCircle className="spin" size={25} /><h3>On ouvre les casiers.</h3><p>Les ressources arrivent.</p></div>
          ) : error ? (
            <div className="empty-state"><BookOpen size={25} /><h3>Le fil est momentanément indisponible.</h3><p>{error}</p><button className="button button-secondary" onClick={() => window.location.reload()} type="button">Réessayer</button></div>
          ) : visibleResources.length === 0 ? (
            <div className="empty-state"><UsersRound size={25} /><h3>À vous d’ouvrir le bal.</h3><p>Aucun support ne correspond à ces filtres. Déposez le premier cours ou la première annale de la promo.</p><Link className="button button-coral" href="/resources/new">Partager une ressource</Link></div>
          ) : (
            <div className="resource-grid">{visibleResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>
          )}
        </section>
      </main>
    </div>
  );
}
