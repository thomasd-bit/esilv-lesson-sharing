"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, FilePlus2, LoaderCircle, Search, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ResourceCard } from "@/components/resource-card";
import { createClient } from "@/lib/supabase/client";
import { appConfig } from "@/lib/config";
import { RESOURCE_KINDS, STUDY_YEARS, type Profile, type Resource, type ResourceKind, type ResourceWithAuthor, type StudyYear } from "@/lib/types";

type DashboardProps = {
  email: string;
  profile: Profile | null;
  userId: string;
};

export function Dashboard({ email, profile, userId }: DashboardProps) {
  const [resources, setResources] = useState<ResourceWithAuthor[]>([]);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | ResourceKind>("all");
  const [year, setYear] = useState<"all" | StudyYear>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const cleanedSearch = search.trim().replace(/[,%()]/g, " ").slice(0, 80);
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
      const { data: profiles } = authorIds.length
        ? await supabase.from("profiles").select("id, display_name, programme, study_year, avatar_url, created_at").in("id", authorIds)
        : { data: [] };
      const profileRows = (profiles ?? []) as unknown as Profile[];
      const profileById = new Map(profileRows.map((author) => [author.id, author]));

      setResources(rows.map((resource) => ({ ...resource, author: profileById.get(resource.author_id) ?? null })));
      setLoading(false);
    }

    void loadResources();
    return () => { active = false; };
  }, [kind, search, year]);

  const programmeCount = useMemo(() => new Set(resources.map((resource) => resource.programme)).size, [resources]);
  const displayName = profile?.display_name ?? email.split("@")[0] ?? "Étudiant";

  return (
    <div className="app-page">
      <AppHeader displayName={displayName} email={email} userId={userId} />
      <main className="content-wrap">
        <section className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Bonjour {displayName.split(" ")[0]}</span>
            <h1>Ce que la promo a appris, la promo le garde.</h1>
            <p>{appConfig.description} Trouvez une ressource, ajoutez votre retour, puis transmettez ce qui vous a débloqué.</p>
          </div>
          <aside className="profile-card">
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
          </aside>
        </section>

        <section className="stats-grid" aria-label="Aperçu de la communauté">
          <div className="stat-card"><span className="stat-value">{resources.length}</span><span className="stat-label">ressources visibles</span></div>
          <div className="stat-card"><span className="stat-value">{programmeCount}</span><span className="stat-label">formations représentées</span></div>
          <div className="stat-card"><span className="stat-value">{new Set(resources.map((resource) => resource.subject)).size}</span><span className="stat-label">matières couvertes</span></div>
        </section>

        <section id="ressources">
          <div className="section-heading">
            <div>
              <h2>Les dernières ressources</h2>
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
          </div>

          {loading ? (
            <div className="empty-state"><LoaderCircle className="spin" size={25} /><h3>On ouvre les casiers.</h3><p>Les ressources arrivent.</p></div>
          ) : error ? (
            <div className="empty-state"><BookOpen size={25} /><h3>Le fil est momentanément indisponible.</h3><p>{error}</p><button className="button button-secondary" onClick={() => window.location.reload()} type="button">Réessayer</button></div>
          ) : resources.length === 0 ? (
            <div className="empty-state"><UsersRound size={25} /><h3>À vous d’ouvrir le bal.</h3><p>Aucun support ne correspond à ces filtres. Déposez le premier cours ou la première annale de la promo.</p><Link className="button button-coral" href="/resources/new">Partager une ressource</Link></div>
          ) : (
            <div className="resource-grid">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>
          )}
        </section>
      </main>
    </div>
  );
}
