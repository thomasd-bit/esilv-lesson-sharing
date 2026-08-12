import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { hasSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  if (!hasSupabaseConfig()) redirect("/auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("id, display_name, programme, study_year, avatar_url, created_at").eq("id", user.id).maybeSingle();

  return (
    <div className="app-page">
      <header className="app-header">
        <Link className="button button-quiet button-small" href="/"><ArrowLeft size={16} /> Retour aux ressources</Link>
        <span className="eyebrow">Mon profil</span>
      </header>
      <main id="main-content" className="content-wrap">
        <div className="page-header">
          <div>
            <span className="eyebrow">Votre carte dans la communauté</span>
            <h1>Un profil simple, mais identifiable.</h1>
            <p>Les autres étudiants voient votre nom affiché, votre formation et votre année. Votre adresse e-mail reste réservée à la connexion.</p>
          </div>
        </div>
        <div className="form-card profile-page-card">
          <div className="profile-card-top"><span className="avatar" style={{ width: "48px", height: "48px" }}><UserRound size={21} /></span><div><strong>{user.email}</strong><small>Adresse utilisée pour la connexion</small></div></div>
          <ProfileForm userId={user.id} profile={profile as Profile | null} />
        </div>
      </main>
    </div>
  );
}
