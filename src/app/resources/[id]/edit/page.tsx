import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ResourceForm } from "@/components/resource-form";
import { hasSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Resource } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
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
  if (resource.author_id !== user.id) redirect(`/resources/${id}`);

  return (
    <div className="app-page">
      <header className="app-header">
        <Link className="button button-quiet button-small" href={`/resources/${id}`}><ArrowLeft size={16} /> Retour à la ressource</Link>
        <span className="eyebrow"><Pencil size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Modifier un partage</span>
      </header>
      <main id="main-content" className="content-wrap">
        <div className="page-header">
          <div>
            <span className="eyebrow">Mise à jour</span>
            <h1>Gardez ce support utile dans le temps.</h1>
            <p>Corrigez le contexte, la matière ou le lien sans perdre les likes, les sauvegardes et les retours déjà reçus.</p>
          </div>
        </div>
        <div className="form-card">
          <ResourceForm initialProgramme={resource.programme} initialStudyYear={resource.study_year} resource={resource as Resource} />
        </div>
      </main>
    </div>
  );
}
