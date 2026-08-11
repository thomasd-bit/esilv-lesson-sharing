import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";
import { redirect } from "next/navigation";
import { SavedResources } from "@/components/saved-resources";
import { hasSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  if (!hasSupabaseConfig()) redirect("/auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  return (
    <div className="app-page">
      <header className="app-header">
        <Link className="button button-quiet button-small" href="/"><ArrowLeft size={16} /> Retour aux ressources</Link>
        <span className="eyebrow"><Bookmark size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Mes sauvegardes</span>
      </header>
      <main className="content-wrap">
        <div className="page-header">
          <div>
            <span className="eyebrow">À relire plus tard</span>
            <h1>Votre petite réserve de supports.</h1>
            <p>Les ressources que vous avez gardées restent accessibles ici, même quand le fil a déjà avancé.</p>
          </div>
        </div>
        <SavedResources userId={user.id} />
      </main>
    </div>
  );
}

