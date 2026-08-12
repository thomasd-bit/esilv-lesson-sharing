import Link from "next/link";
import { ArrowLeft, BookOpen, UserRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ResourceCard } from "@/components/resource-card";
import { formatDate, initials } from "@/lib/format";
import { isMaintainerEmail } from "@/lib/moderation";
import { hasSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Resource, ResourceWithAuthor } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) redirect("/auth");
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [{ data: rawMember }, { data: rawViewerProfile }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").eq("id", user.id).maybeSingle(),
  ]);
  if (!rawMember) notFound();

  const { data: rawResources } = await supabase
    .from("resources")
    .select("id, title, description, kind, subject, programme, study_year, link_url, file_path, author_id, status, like_count, created_at, updated_at")
    .eq("author_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(100);

  const member = rawMember as Profile;
  const viewerProfile = rawViewerProfile as Profile | null;
  const resources = (rawResources ?? []) as Resource[];
  const resourceCards: ResourceWithAuthor[] = resources.map((resource) => ({ ...resource, author: member }));
  const viewerName = viewerProfile?.display_name ?? user.email?.split("@")[0] ?? "Étudiant";

  return (
    <div className="app-page">
      <AppHeader displayName={viewerName} email={user.email ?? ""} userId={user.id} isMaintainer={isMaintainerEmail(user.email, process.env.MAINTAINER_EMAILS ?? "")} />
      <main id="main-content" className="content-wrap">
        <Link className="button button-quiet button-small member-back-link" href="/"><ArrowLeft size={16} /> Retour aux ressources</Link>
        <section className="member-profile-card" aria-labelledby="member-name">
          <span className="member-profile-avatar avatar">{member.display_name ? initials(member.display_name) : <UserRound size={24} />}</span>
          <div>
            <span className="eyebrow">Membre de Passerelle</span>
            <h1 id="member-name">{member.display_name}</h1>
            <div className="member-profile-meta">
              {member.programme ? <span className="pill">{member.programme}</span> : null}
              {member.study_year ? <span className="pill">{member.study_year}</span> : null}
              <span className="field-hint">Membre depuis {formatDate(member.created_at)}</span>
            </div>
            {member.bio ? <p className="member-profile-bio">{member.bio}</p> : <p className="field-hint">Ce membre n’a pas encore ajouté de présentation.</p>}
          </div>
        </section>

        <section aria-labelledby="member-resources-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow"><BookOpen size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Ses partages</span>
              <h2 id="member-resources-title">Ressources publiées</h2>
              <p>Les supports que {member.display_name} a choisi de transmettre à la communauté.</p>
            </div>
          </div>
          {resourceCards.length === 0 ? (
            <div className="empty-state"><BookOpen size={25} /><h3>Pas encore de ressource publique.</h3><p>Les prochains partages de ce membre apparaîtront ici.</p></div>
          ) : <div className="resource-grid">{resourceCards.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div>}
        </section>
      </main>
    </div>
  );
}
