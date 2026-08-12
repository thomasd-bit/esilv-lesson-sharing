import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ResourceDetail } from "@/components/resource-detail";
import { hasSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Resource } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) redirect("/auth");
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: resource } = await supabase
    .from("resources")
    .select("id, title, description, kind, subject, programme, study_year, link_url, file_path, author_id, status, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!resource) notFound();

  const { data: author } = await supabase
    .from("profiles")
    .select("id, display_name, programme, study_year, bio, avatar_url, created_at")
    .eq("id", resource.author_id)
    .maybeSingle();

  return (
    <div className="app-page">
      <header className="app-header">
        <Link className="button button-quiet button-small" href="/"><ArrowLeft size={16} /> Toutes les ressources</Link>
        <span className="eyebrow">Fiche ressource</span>
      </header>
      <main id="main-content" className="content-wrap">
        <ResourceDetail resource={resource as Resource} author={author as Profile | null} currentUserId={user.id} />
      </main>
    </div>
  );
}
