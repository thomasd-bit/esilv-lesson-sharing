import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ResourceForm } from "@/components/resource-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  if (!hasSupabaseConfig()) {
    redirect("/auth");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("programme, study_year")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="app-page">
      <header className="app-header">
        <Link className="button button-quiet button-small" href="/"><ArrowLeft size={16} /> Retour aux ressources</Link>
        <span className="eyebrow">Partager avec la promo</span>
      </header>
      <main id="main-content" className="content-wrap">
        <div className="page-header">
          <div>
            <span className="eyebrow">Nouveau support</span>
            <h1>Déposer quelque chose d’utile.</h1>
            <p>Un bon titre, deux lignes de contexte et les étudiants sauront immédiatement si ce support leur correspond.</p>
          </div>
        </div>
        <div className="form-card">
          <ResourceForm initialProgramme={profile?.programme ?? ""} initialStudyYear={profile?.study_year ?? ""} />
          <p className="field-hint" style={{ display: "flex", gap: "7px", alignItems: "center", marginTop: "20px" }}><ShieldCheck size={15} /> Les ressources sont visibles uniquement par les membres connectés.</p>
        </div>
      </main>
    </div>
  );
}
