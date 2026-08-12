"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, BookmarkPlus, FilePlus2, LoaderCircle, Search, Trash2, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ResourceCard } from "@/components/resource-card";
import { createClient } from "@/lib/supabase/client";
import { appConfig } from "@/lib/config";
import { getProfileCompletion } from "@/lib/profile";
import { buildResourceFilterQuery, getProgrammeOptions, getResourceOrder, getResourcePageRange, hasMoreResourcePage, normalizeResourceFilters, RESOURCE_PAGE_SIZE, sortResources, type ResourceFilterState, type ResourceSort } from "@/lib/resources";
import { RESOURCE_KIND_LABELS, RESOURCE_KINDS, STUDY_YEARS, type Profile, type Resource, type ResourceKind, type ResourceWithAuthor, type SavedResourceSearch, type StudyYear } from "@/lib/types";
import { firstValidationError, savedSearchSchema } from "@/lib/validation";

type DashboardProps = {
  email: string;
  profile: Profile | null;
  userId: string;
  isMaintainer: boolean;
  initialFilters: ResourceFilterState;
};

const savedSearchSelect = "id, owner_id, name, search, kind, study_year, programme, sort, created_at, updated_at";

function describeSavedSearch(savedSearch: SavedResourceSearch) {
  const parts = [
    savedSearch.search ? `« ${savedSearch.search} »` : null,
    savedSearch.kind === "all" ? null : RESOURCE_KIND_LABELS[savedSearch.kind],
    savedSearch.study_year === "all" ? null : savedSearch.study_year,
    savedSearch.programme === "all" ? null : savedSearch.programme,
    savedSearch.sort === "popular" ? "Plus appréciées" : "Plus récentes",
  ].filter(Boolean);

  return parts.join(" · ") || "Tous les supports";
}

export function Dashboard({ email, profile, userId, isMaintainer, initialFilters }: DashboardProps) {
  const [resources, setResources] = useState<ResourceWithAuthor[]>([]);
  const [search, setSearch] = useState(initialFilters.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search);
  const [kind, setKind] = useState<"all" | ResourceKind>(initialFilters.kind);
  const [year, setYear] = useState<"all" | StudyYear>(initialFilters.year);
  const [programme, setProgramme] = useState(initialFilters.programme);
  const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([]);
  const [sort, setSort] = useState<ResourceSort>(initialFilters.sort);
  const [savedSearches, setSavedSearches] = useState<SavedResourceSearch[]>([]);
  const [savedSearchesError, setSavedSearchesError] = useState<string | null>(null);
  const [showSaveSearchForm, setShowSaveSearchForm] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [savedSearchError, setSavedSearchError] = useState<string | null>(null);
  const [savedSearchSaving, setSavedSearchSaving] = useState(false);
  const [savedSearchDeletingId, setSavedSearchDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const query = buildResourceFilterQuery({ search: debouncedSearch, kind, year, programme, sort });
    const nextUrl = query ? `/?${query}` : "/";
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) window.history.replaceState(window.history.state, "", nextUrl);
  }, [debouncedSearch, kind, programme, sort, year]);

  useEffect(() => {
    let active = true;
    async function loadSavedSearches() {
      const { data, error: savedSearchError } = await createClient()
        .from("saved_resource_searches")
        .select(savedSearchSelect)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (savedSearchError) {
        setSavedSearchesError("Les recherches enregistrées ne sont pas disponibles pour le moment.");
        return;
      }
      setSavedSearches((data ?? []) as unknown as SavedResourceSearch[]);
      setSavedSearchesError(null);
    }

    void loadSavedSearches();
    return () => { active = false; };
  }, [userId]);

  const loadPage = useCallback(async (offset: number) => {
    const supabase = createClient();
    let request = supabase
      .from("resources")
      .select("id, title, description, kind, subject, programme, study_year, link_url, file_path, author_id, status, like_count, download_count, created_at, updated_at")
      .eq("status", "published");

    for (const order of getResourceOrder(sort)) {
      request = request.order(order.column, { ascending: order.ascending });
    }

    if (kind !== "all") request = request.eq("kind", kind);
    if (year !== "all") request = request.eq("study_year", year);
    if (programme !== "all") request = request.eq("programme", programme);

    const cleanedSearch = debouncedSearch.replace(/[,%()]/g, " ").slice(0, 80);
    if (cleanedSearch) request = request.or(`title.ilike.%${cleanedSearch}%,description.ilike.%${cleanedSearch}%,subject.ilike.%${cleanedSearch}%`);

    const { from, to } = getResourcePageRange(offset);
    const { data, error: resourcesError } = await request.range(from, to);
    if (resourcesError) throw resourcesError;

    const rows = (data ?? []) as Resource[];
    const authorIds = [...new Set(rows.map((resource) => resource.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").in("id", authorIds)
      : { data: [] };
    const profileRows = (profiles ?? []) as unknown as Profile[];
    const profileById = new Map(profileRows.map((author) => [author.id, author]));

    const enrichedResources = rows.map((resource) => ({
      ...resource,
      author: profileById.get(resource.author_id) ?? null,
    }));

    return {
      resources: enrichedResources,
      programmes: getProgrammeOptions(rows),
      hasMore: hasMoreResourcePage(rows.length),
    };
  }, [debouncedSearch, kind, programme, sort, year]);

  useEffect(() => {
    let active = true;
    const requestId = ++requestIdRef.current;

    async function loadResources() {
      setLoading(true);
      setLoadingMore(false);
      setError(null);
      setResources([]);
      setHasMore(false);
      try {
        const page = await loadPage(0);
        if (!active || requestId !== requestIdRef.current) return;
        if (programme === "all") setAvailableProgrammes(page.programmes);
        setResources(page.resources);
        setHasMore(page.hasMore);
      } catch {
        if (active && requestId === requestIdRef.current) setError("Les ressources ne peuvent pas être chargées pour le moment.");
      } finally {
        if (active && requestId === requestIdRef.current) setLoading(false);
      }
    }

    void loadResources();
    return () => { active = false; };
  }, [loadPage, programme]);

  async function loadMoreResources() {
    if (loading || loadingMore || !hasMore) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await loadPage(resources.length);
      if (requestId !== requestIdRef.current) return;
      setResources((current) => [...current, ...page.resources]);
      if (programme === "all") {
        setAvailableProgrammes((current) => getProgrammeOptions([
          ...current.map((value) => ({ programme: value })),
          ...page.resources,
        ]));
      }
      setHasMore(page.hasMore);
    } catch {
      if (requestId === requestIdRef.current) setError("Les ressources supplémentaires ne peuvent pas être chargées.");
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }

  function applySavedSearch(savedSearch: SavedResourceSearch) {
    setSearch(savedSearch.search);
    setDebouncedSearch(savedSearch.search);
    setKind(savedSearch.kind);
    setYear(savedSearch.study_year);
    setProgramme(savedSearch.programme || "all");
    setSort(savedSearch.sort);
    setShowSaveSearchForm(false);
    setSavedSearchError(null);
  }

  async function saveCurrentSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = savedSearchSchema.safeParse({ name: savedSearchName });
    if (!parsed.success) {
      setSavedSearchError(firstValidationError(parsed.error));
      return;
    }

    const filters = normalizeResourceFilters({ search, kind, year, programme, sort });
    if (!buildResourceFilterQuery(filters)) {
      setSavedSearchError("Ajoutez au moins un filtre avant d’enregistrer cette recherche.");
      return;
    }

    setSavedSearchSaving(true);
    setSavedSearchError(null);
    try {
      const { data, error: insertError } = await createClient()
        .from("saved_resource_searches")
        .insert({
          owner_id: userId,
          name: parsed.data.name,
          search: filters.search,
          kind: filters.kind,
          study_year: filters.year,
          programme: filters.programme,
          sort: filters.sort,
        })
        .select(savedSearchSelect)
        .single();
      if (insertError || !data) {
        setSavedSearchError(insertError?.code === "23505" ? "Vous avez déjà une recherche avec ce nom." : "La recherche n’a pas pu être enregistrée.");
        return;
      }
      setSavedSearches((current) => [data as unknown as SavedResourceSearch, ...current]);
      setSavedSearchName("");
      setShowSaveSearchForm(false);
    } finally {
      setSavedSearchSaving(false);
    }
  }

  async function deleteSavedSearch(savedSearch: SavedResourceSearch) {
    if (savedSearchDeletingId) return;
    if (!window.confirm(`Supprimer la recherche « ${savedSearch.name} » ?`)) return;
    setSavedSearchDeletingId(savedSearch.id);
    setSavedSearchError(null);
    try {
      const { error: deleteError } = await createClient()
        .from("saved_resource_searches")
        .delete()
        .eq("id", savedSearch.id)
        .eq("owner_id", userId);
      if (deleteError) {
        setSavedSearchError("La recherche n’a pas pu être supprimée.");
        return;
      }
      setSavedSearches((current) => current.filter((item) => item.id !== savedSearch.id));
    } finally {
      setSavedSearchDeletingId(null);
    }
  }

  const visibleResources = useMemo(() => sortResources(resources, sort), [resources, sort]);
  const programmeOptions = useMemo(() => programme === "all" || availableProgrammes.includes(programme)
    ? availableProgrammes
    : [programme, ...availableProgrammes], [availableProgrammes, programme]);
  const currentFilters = normalizeResourceFilters({ search, kind, year, programme, sort });
  const hasActiveFilters = Boolean(buildResourceFilterQuery(currentFilters));
  const programmeCount = useMemo(() => new Set(visibleResources.map((resource) => resource.programme)).size, [visibleResources]);
  const displayName = profile?.display_name ?? email.split("@")[0] ?? "Étudiant";
  const profileCompletion = getProfileCompletion(profile);

  return (
    <div className="app-page">
      <AppHeader displayName={displayName} email={email} userId={userId} isMaintainer={isMaintainer} />
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
          <div className="stat-card"><span className="stat-value">{visibleResources.length}{hasMore ? "+" : ""}</span><span className="stat-label">ressources affichées</span></div>
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
            <select className="filter-select" value={programme} onChange={(event) => setProgramme(event.target.value)} aria-label="Filtrer par formation">
              <option value="all">Toutes les formations</option>
              {programmeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select className="filter-select" value={sort} onChange={(event) => setSort(event.target.value as ResourceSort)} aria-label="Trier les ressources">
              <option value="recent">Plus récentes</option>
              <option value="popular">Plus appréciées</option>
            </select>
            {hasActiveFilters ? <button className="filter-reset" onClick={() => { setSearch(""); setKind("all"); setYear("all"); setProgramme("all"); setSort("recent"); }} type="button">Réinitialiser</button> : null}
          </div>

          <section className="saved-search-panel" aria-labelledby="saved-searches-title">
            <div className="saved-search-header">
              <div>
                <span className="eyebrow" id="saved-searches-title"><BookmarkPlus size={13} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Mes recherches</span>
                <p>Gardez un filtre sous la main pour vos prochaines révisions.</p>
              </div>
              {hasActiveFilters && !savedSearchesError ? <button className="button button-secondary button-small" onClick={() => { setShowSaveSearchForm((value) => !value); setSavedSearchError(null); }} type="button"><BookmarkPlus size={15} /> {showSaveSearchForm ? "Fermer" : "Enregistrer ces filtres"}</button> : null}
            </div>
            {savedSearchesError ? <p className="field-hint" role="status">{savedSearchesError} Appliquez la migration `20260812090000_saved_searches.sql` pour activer cette fonction.</p> : null}
            {showSaveSearchForm ? (
              <form className="saved-search-form" onSubmit={(event) => void saveCurrentSearch(event)}>
                <label className="field" htmlFor="savedSearchName"><span>Nom de la recherche</span><input id="savedSearchName" autoFocus maxLength={60} value={savedSearchName} onChange={(event) => setSavedSearchName(event.target.value)} placeholder="Ex. Annales de probabilités" /></label>
                <div className="inline-actions saved-search-form-actions">
                  {savedSearchError ? <span className="field-error" role="alert">{savedSearchError}</span> : null}
                  <button className="button button-quiet button-small" onClick={() => { setShowSaveSearchForm(false); setSavedSearchError(null); }} type="button">Annuler</button>
                  <button className="button button-primary button-small" disabled={savedSearchSaving} type="submit">{savedSearchSaving ? <LoaderCircle className="spin" size={15} /> : <BookmarkPlus size={15} />} {savedSearchSaving ? "Enregistrement…" : "Enregistrer"}</button>
                </div>
              </form>
            ) : null}
            {savedSearchError && !showSaveSearchForm ? <p className="form-error" role="alert">{savedSearchError}</p> : null}
            {savedSearches.length > 0 ? (
              <div className="saved-search-list" aria-label="Recherches enregistrées">
                {savedSearches.map((savedSearch) => (
                  <div className="saved-search-item" key={savedSearch.id}>
                    <button className="saved-search-apply" onClick={() => applySavedSearch(savedSearch)} type="button">
                      <strong>{savedSearch.name}</strong>
                      <small>{describeSavedSearch(savedSearch)}</small>
                    </button>
                    <button className="saved-search-delete" aria-label={`Supprimer ${savedSearch.name}`} disabled={Boolean(savedSearchDeletingId)} onClick={() => void deleteSavedSearch(savedSearch)} type="button">
                      {savedSearchDeletingId === savedSearch.id ? <LoaderCircle className="spin" size={14} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            ) : !savedSearchesError ? <p className="field-hint saved-search-empty">Aucune recherche enregistrée pour le moment.</p> : null}
          </section>

          {loading ? (
            <div className="empty-state"><LoaderCircle className="spin" size={25} /><h3>On ouvre les casiers.</h3><p>Les ressources arrivent.</p></div>
          ) : error && visibleResources.length === 0 ? (
            <div className="empty-state"><BookOpen size={25} /><h3>Le fil est momentanément indisponible.</h3><p>{error}</p><button className="button button-secondary" onClick={() => window.location.reload()} type="button">Réessayer</button></div>
          ) : visibleResources.length === 0 ? (
            <div className="empty-state"><UsersRound size={25} /><h3>À vous d’ouvrir le bal.</h3><p>Aucun support ne correspond à ces filtres. Déposez le premier cours ou la première annale de la promo.</p><Link className="button button-coral" href="/resources/new">Partager une ressource</Link></div>
          ) : (
            <>
              <div className="resource-grid">{visibleResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              {hasMore ? <div className="load-more-wrap"><button className="button button-secondary" disabled={loadingMore} onClick={() => void loadMoreResources()} type="button">{loadingMore ? <LoaderCircle className="spin" size={16} /> : null}{loadingMore ? "Chargement…" : `Charger les ${RESOURCE_PAGE_SIZE} suivantes`}</button><p className="field-hint">Les supports les plus anciens restent disponibles en continuant le chargement.</p></div> : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
