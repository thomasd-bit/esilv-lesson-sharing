import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleDot, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { formatDate } from "@/lib/format";
import { hasModerationConfig, isMaintainerEmail, isReportStatus, REPORT_STATUS_LABELS } from "@/lib/moderation";
import { createAdminClient, hasServiceRoleConfig } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Resource, ResourceReport, ResourceReportStatus } from "@/lib/types";
import { updateReportStatus } from "@/app/moderation/actions";

type StatusFilter = "all" | ResourceReportStatus;
type ReportResource = Pick<Resource, "id" | "title" | "status" | "author_id" | "created_at">;
type ReportView = ResourceReport & {
  resource: ReportResource | null;
  reporter: Profile | null;
  author: Profile | null;
};

export const dynamic = "force-dynamic";

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  if (!hasServiceRoleConfig()) {
    return <ModerationConfigurationPage />;
  }

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) redirect("/auth");
  if (!isMaintainerEmail(user.email, process.env.MAINTAINER_EMAILS ?? "")) redirect("/");

  const { data: profile } = await sessionClient
    .from("profiles")
    .select("id, display_name, programme, study_year, bio, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();
  const typedProfile = profile as Profile | null;
  const displayName = typedProfile?.display_name ?? user.email?.split("@")[0] ?? "Mainteneur";

  if (!hasModerationConfig()) {
    return <ModerationShell displayName={displayName} email={user.email ?? ""} userId={user.id}>
      <div className="message-card message-card-wide">
        <ShieldCheck className="message-card-icon" size={25} />
        <h2>La file de modération n’est pas configurée</h2>
        <p>Ajoutez <code>MAINTAINER_EMAILS</code> et la clé serveur <code>SUPABASE_SERVICE_ROLE_KEY</code> à l’environnement du serveur. Ces valeurs restent privées et ne doivent jamais être préfixées par <code>NEXT_PUBLIC_</code>.</p>
      </div>
    </ModerationShell>;
  }

  const adminClient = createAdminClient();
  const { data: rawReports, error: reportsError } = await adminClient
    .from("resource_reports")
    .select("id, resource_id, reporter_id, reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (reportsError) {
    return <ModerationShell displayName={displayName} email={user.email ?? ""} userId={user.id}>
      <div className="form-error" role="alert">Les signalements ne peuvent pas être chargés pour le moment.</div>
    </ModerationShell>;
  }

  const reports = (rawReports ?? []) as ResourceReport[];
  const resourceIds = [...new Set(reports.map((report) => report.resource_id))];
  const reporterIds = [...new Set(reports.map((report) => report.reporter_id))];
  const [{ data: rawResources }, { data: rawProfiles }] = await Promise.all([
    resourceIds.length
      ? adminClient.from("resources").select("id, title, status, author_id, created_at").in("id", resourceIds)
      : Promise.resolve({ data: [] }),
    reporterIds.length
      ? adminClient.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").in("id", reporterIds)
      : Promise.resolve({ data: [] }),
  ]);
  const resourcesById = new Map(((rawResources ?? []) as ReportResource[]).map((resource) => [resource.id, resource]));
  const profilesById = new Map(((rawProfiles ?? []) as unknown as Profile[]).map((profileRow) => [profileRow.id, profileRow]));
  const authorIds = [...new Set((rawResources ?? []).map((resource) => (resource as ReportResource).author_id))];
  const { data: rawAuthors } = authorIds.length
    ? await adminClient.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").in("id", authorIds)
    : { data: [] };
  const authorsById = new Map(((rawAuthors ?? []) as unknown as Profile[]).map((author) => [author.id, author]));
  const reportViews: ReportView[] = reports.map((report) => {
    const resource = resourcesById.get(report.resource_id) ?? null;
    return {
      ...report,
      resource,
      reporter: profilesById.get(report.reporter_id) ?? null,
      author: resource ? authorsById.get(resource.author_id) ?? null : null,
    };
  });

  const query = await searchParams;
  const requestedFilter = Array.isArray(query.status) ? query.status[0] : query.status;
  const filter: StatusFilter = requestedFilter === "all" || (requestedFilter && isReportStatus(requestedFilter))
    ? requestedFilter as StatusFilter
    : "open";
  const counts = {
    all: reportViews.length,
    open: reportViews.filter((report) => report.status === "open").length,
    reviewed: reportViews.filter((report) => report.status === "reviewed").length,
    closed: reportViews.filter((report) => report.status === "closed").length,
  };
  const visibleReports = filter === "all" ? reportViews : reportViews.filter((report) => report.status === filter);

  return <ModerationShell displayName={displayName} email={user.email ?? ""} userId={user.id}>
    <section className="stats-grid moderation-stats" aria-label="Résumé des signalements">
      <div className="stat-card"><span className="stat-value">{counts.open}</span><span className="stat-label">à traiter</span></div>
      <div className="stat-card"><span className="stat-value">{counts.reviewed}</span><span className="stat-label">traités</span></div>
      <div className="stat-card"><span className="stat-value">{counts.closed}</span><span className="stat-label">fermés</span></div>
    </section>

    <section className="moderation-panel" aria-labelledby="moderation-list-title">
      <div className="moderation-toolbar">
        <div>
          <span className="eyebrow">File de suivi</span>
          <h2 id="moderation-list-title">Les signalements récents</h2>
        </div>
        <nav className="moderation-filters" aria-label="Filtrer les signalements">
          {(["open", "reviewed", "closed", "all"] as const).map((status) => <Link className={`moderation-filter ${filter === status ? "moderation-filter-active" : ""}`} href={`/moderation?status=${status}`} key={status}>{status === "all" ? "Tous" : REPORT_STATUS_LABELS[status]} <span>{counts[status]}</span></Link>)}
        </nav>
      </div>

      {visibleReports.length === 0 ? (
        <div className="empty-state moderation-empty"><CheckCircle2 size={25} /><h3>{filter === "open" ? "La file est à jour." : "Aucun signalement ici."}</h3><p>{filter === "open" ? "Les nouveaux signalements apparaîtront ici dès qu’un étudiant en transmettra un." : "Changez de filtre pour consulter un autre état de suivi."}</p></div>
      ) : (
        <div className="moderation-list">
          {visibleReports.map((report) => <ReportCard key={report.id} report={report} />)}
        </div>
      )}
    </section>
  </ModerationShell>;
}

function ModerationShell({ children, displayName, email, userId }: { children: React.ReactNode; displayName: string; email: string; userId: string }) {
  return <div className="app-page">
    <AppHeader displayName={displayName} email={email} userId={userId} isMaintainer />
    <main id="main-content" className="content-wrap">
      <div className="page-header">
        <div>
          <span className="eyebrow"><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Espace mainteneur</span>
          <h1>Garder les signalements actionnables.</h1>
          <p>Traitez les liens morts, les doublons et les contenus à revoir sans exposer cette file aux étudiants.</p>
        </div>
      </div>
      {children}
    </main>
  </div>;
}

function ModerationConfigurationPage() {
  return <div className="app-page"><main id="main-content" className="content-wrap"><div className="message-card message-card-wide"><AlertTriangle className="message-card-icon" size={25} /><h1>La modération est réservée aux mainteneurs.</h1><p>Connectez-vous avec un compte autorisé pour accéder à cette page.</p><Link className="button button-secondary" href="/auth">Se connecter</Link></div></main></div>;
}

function ReportCard({ report }: { report: ReportView }) {
  const resourceLabel = report.resource?.title ?? "Ressource supprimée";
  const reporterName = report.reporter?.display_name ?? "Étudiant";
  const authorName = report.author?.display_name ?? "Auteur inconnu";

  return <article className="moderation-card">
    <div className="moderation-card-top">
      <div className="moderation-status-row"><span className={`status-pill status-pill-${report.status}`}><CircleDot size={13} /> {REPORT_STATUS_LABELS[report.status]}</span><time dateTime={report.created_at}>{formatDate(report.created_at)}</time></div>
      {report.resource?.status === "published" ? <Link className="text-button" href={`/resources/${report.resource.id}`}>Ouvrir <ArrowUpRight size={14} /></Link> : <span className="field-hint">Ressource masquée</span>}
    </div>
    <h3>{resourceLabel}</h3>
    <p className="moderation-reason">{report.reason}</p>
    <p className="moderation-meta">Signalé par <strong>{reporterName}</strong> · auteur : <strong>{authorName}</strong></p>
    <div className="moderation-actions">
      {report.status === "open" ? <StatusAction reportId={report.id} status="reviewed">Marquer traité</StatusAction> : null}
      {report.status !== "closed" ? <StatusAction reportId={report.id} status="closed">Fermer</StatusAction> : null}
      {report.status !== "open" ? <StatusAction reportId={report.id} status="open">Rouvrir</StatusAction> : null}
    </div>
  </article>;
}

function StatusAction({ reportId, status, children }: { reportId: string; status: ResourceReportStatus; children: React.ReactNode }) {
  return <form action={updateReportStatus}><input type="hidden" name="reportId" value={reportId} /><input type="hidden" name="status" value={status} /><button className="button button-secondary button-small" type="submit">{children}</button></form>;
}
